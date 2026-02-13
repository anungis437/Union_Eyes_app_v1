/**
 * Chatbot Messages API
 * 
 * Endpoints for sending messages and getting AI responses
 * - POST /api/chatbot/messages - Send a message and get AI response
 * 
 * Uses the hereditary-attentive template approach via role-templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { chatSessions, chatMessages } from '@/db/schema/ai-chatbot-schema';
import { eq, and, asc } from 'drizzle-orm';
import { withRoleAuth } from '@/lib/role-middleware';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { v4 as uuidv4 } from 'uuid';

// Import role templates for hereditary-attentive approach
import { stewardTemplates, officerTemplates, adminTemplates, mobileTemplates } from '@/lib/ai/role-templates';

// French translations for system prompts
const frenchTemplates = {
  stewardGrievance: `Vous êtes un représentant syndical qui traite les griefs des membres.

VOTRE RÔLE PRINCIPAL :
- Premier point de contact pour les membres ayant des préoccupations au travail
- Enquêter et documenter les griefs thoroughly
- Représenter les membres aux étapes 1 et 2 des griefs
- Connaître la Convention collective

STYLE DE RÉPONSE :
- Soyez empathique et solidaire
- Posez des questions clarifiantes
- Expliquez clairement le processus de grief
- Définissez des attentes réalistes

CONNAISSANCES CRITIQUES :
- Respectez les délais de dépôt de grief (5-10 jours ouvrables)
- Connaissez les droits Weingarten
- Documentez tout avec dates, heures, témoins
- Gardez les informations confidentielles`,

  officerBargaining: `Vous êtes un officiel syndical impliqué dans la négociation collective.

VOTRE RÔLE :
- Mener les négociations avec la direction
- Préparer les propositions de convention collective
- Communiquer les mises à jour aux membres
- Gérer les enjeux de gouvernance syndicale

CONNAISSANCES NÉCESSAIRES :
- Lois du travail applicables
- Stratégies de négociation
- Analyse financière
- Communication syndicale`,

  memberPortal: `Vous êtes un assistant mobile pour les membres syndicaux accédant à UnionEyes sur leur téléphone.

OPTIMISATION MOBILE :
- Gardez les réponses concises
- Utilisez des listes à puces
- Mettez en évidence les actions claires
- Priorisez les informations importantes

CE QUE LES MEMBRE PEUVENT FAIRE :
- Vérifier le statut des cotisations
- Soumettre des griefs
- Mettre à jour leurs coordonnées
- Voir les événements à venir`,
};

// Function to get template based on role and language
function getTemplate(role: string, isFrench: boolean, isMobile: boolean) {
  if (isFrench) {
    if (role === 'steward' || role === 'chief_steward') {
      return frenchTemplates.stewardGrievance;
    } else if (role === 'officer' || role === 'admin') {
      return frenchTemplates.officerBargaining;
    } else if (isMobile) {
      return frenchTemplates.memberPortal;
    }
    return frenchTemplates.stewardGrievance; // Default in French
  }
  
  // English templates
  let englishTemplate;
  if (role === 'steward' || role === 'chief_steward') {
    englishTemplate = stewardTemplates.find(t => t.id === 'steward-grievance')?.systemPrompt || stewardTemplates[0]?.systemPrompt;
  } else if (role === 'officer' || role === 'admin') {
    englishTemplate = officerTemplates.find(t => t.id === 'officer-bargaining')?.systemPrompt || officerTemplates[0]?.systemPrompt;
  } else if (isMobile) {
    englishTemplate = mobileTemplates.find(t => t.id === 'mobile-member')?.systemPrompt || mobileTemplates[0]?.systemPrompt;
  } else {
    englishTemplate = stewardTemplates[0]?.systemPrompt;
  }
  return englishTemplate;
}

// Import transparency types
import { AIDisclosure, ConfidenceLevel } from '@/lib/ai/transparency';

export const POST = withRoleAuth('member', async (request: NextRequest, context) => {
  const { userId, organizationId } = context;
  
  // Rate limiting for AI operations
  const rateLimitResult = await checkRateLimit(
    `ai-completion:${userId}`,
    RATE_LIMITS.AI_COMPLETION
  );
  
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded for AI operations. Please try again later.' },
      { status: 429 }
    );
  }
  
  try {
    const startTime = Date.now();
    const body = await request.json();
    const { sessionId, content, context: messageContext, locale } = body;
    
    // Determine language (default to English)
    const language = (locale as string) || 'en';
    const isFrench = language.startsWith('fr');
    const isMobile = messageContext?.mobile === true;
    
    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }
    
    // Validate or create session
    let session;
    if (sessionId) {
      [session] = await db
        .select()
        .from(chatSessions)
        .where(
          and(
            eq(chatSessions.id, sessionId),
            eq(chatSessions.userId, userId as string)
          )
        );
      
      if (!session) {
        return NextResponse.json(
          { error: 'Chat session not found' },
          { status: 404 }
        );
      }
    } else {
      // Create new session
      const newSessionId = uuidv4();
      [session] = await db.insert(chatSessions).values({
        id: newSessionId,
        userId: userId as string,
        organizationId: (organizationId as string) || 'default-org',
        title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
        status: 'active',
        messageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
    }
    
    // Determine role from context
    const role = (messageContext?.role as string) || 'member';
    
    // Select appropriate template based on role and language
    const systemPrompt = getTemplate(role, isFrench, isMobile);
    
    // Get conversation history
    const history = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, session.id))
      .orderBy(asc(chatMessages.createdAt))
      .limit(10);
    
    // Save user message
    const userMessageId = uuidv4();
    const [userMessage] = await db.insert(chatMessages).values({
      id: userMessageId,
      sessionId: session.id,
      role: 'user',
      content,
      tokensUsed: 0,
      createdAt: new Date(),
    }).returning();
    
    // Get OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 }
      );
    }
    
    // Build messages with template context
    const systemPrompt = template.systemPrompt;
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content },
    ];
    
    // Call OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }
    
    const completion = await response.json();
    const responseContent = completion.choices[0]?.message?.content || 
      'I apologize, but I was unable to generate a response at this time.';
    
    const tokensUsed = completion.usage?.total_tokens || 0;
    
    // Determine confidence based on response length and context
    let confidence: ConfidenceLevel = 'medium';
    if (responseContent.length > 500 && history.length > 2) {
      confidence = 'high';
    } else if (responseContent.length < 100) {
      confidence = 'low';
    }
    
    // Save AI response
    const aiMessageId = uuidv4();
    const [aiMessage] = await db.insert(chatMessages).values({
      id: aiMessageId,
      sessionId: session.id,
      role: 'assistant',
      content: responseContent,
      tokensUsed,
      modelUsed: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      createdAt: new Date(),
    }).returning();
    
    // Update session
    await db
      .update(chatSessions)
      .set({
        messageCount: (session.messageCount || 0) + 2,
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.id, session.id));
    
    // Add disclosure
    const disclosure: AIDisclosure = {
      isAIGenerated: true,
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      modelVersion: '1.0',
      generatedAt: new Date().toISOString(),
      confidence,
      confidenceScore: confidence === 'high' ? 0.85 : confidence === 'medium' ? 0.65 : 0.4,
      humanReviewed: false,
      disclosureVersion: '1.0',
    };
    
    return NextResponse.json({
      message: userMessage,
      response: {
        ...aiMessage,
        disclosure,
      },
      template: {
        language: isFrench ? 'fr' : 'en',
      },
    });
    
  } catch (error) {
    console.error('Chat message error:', error);
    
    // Fallback response
    const fallbackContent = "I apologize, but I'm having trouble processing your request right now. Please try again in a few moments.";
    
    return NextResponse.json({
      error: 'AI service temporarily unavailable',
      fallback: fallbackContent,
    }, { status: 503 });
  }
});
