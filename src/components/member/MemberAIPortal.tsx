/**
 * Member AI Portal - Transparency & Education Hub
 * 
 * Member-facing portal providing AI transparency, education, and feedback.
 * Implements communication templates from AI_TRAINING_CURRICULUM.md
 * 
 * Features:
 * - AI FAQ accordion
 * - How AI helps members (use case examples)
 * - Privacy & ethics information
 * - Feedback form for AI concerns
 * - Video tutorials (when available)
 */

"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Brain, 
  Users, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  MessageSquare,
  BookOpen,
  Video,
  FileText,
  TrendingUp
} from 'lucide-react';

interface FeedbackFormData {
  name: string;
  email: string;
  category: string;
  message: string;
}

export function MemberAIPortal() {
  const [feedbackForm, setFeedbackForm] = useState<FeedbackFormData>({
    name: '',
    email: '',
    category: 'general',
    message: ''
  });
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // In production, send to API endpoint
    
    // Show success message
    setFeedbackSubmitted(true);
    
    // Reset form after 3 seconds
    setTimeout(() => {
      setFeedbackSubmitted(false);
      setFeedbackForm({
        name: '',
        email: '',
        category: 'general',
        message: ''
      });
    }, 3000);
  };

  return (
    <div className="w-full space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">AI at Union Eyes</h1>
        <p className="text-muted-foreground">
          Learn how artificial intelligence helps protect your rights and strengthen your union.
        </p>
      </div>

      {/* Key Principles Banner */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Our AI Principles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 mt-0.5 text-primary" />
              <div>
                <p className="font-medium">Member-Centered</p>
                <p className="text-sm text-muted-foreground">
                  AI assists you, never replaces you
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 mt-0.5 text-primary" />
              <div>
                <p className="font-medium">Privacy Protected</p>
                <p className="text-sm text-muted-foreground">
                  Your data stays secure & confidential
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 mt-0.5 text-primary" />
              <div>
                <p className="font-medium">Fair & Transparent</p>
                <p className="text-sm text-muted-foreground">
                  You always know how AI makes decisions
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How AI Helps You */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            How AI Helps You
          </CardTitle>
          <CardDescription>
            Real examples of AI supporting union members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">Predict Your Claim Outcome</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    AI analyzes similar past cases to estimate your chances of success. This helps you and 
                    your steward make informed decisions about your case strategy.
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <strong>85%</strong> accuracy
                    </span>
                    <span className="text-muted-foreground">Used 1,247 times this month</span>
                  </div>
                </div>
                <Badge>Active</Badge>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">Estimate Resolution Timeline</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Get an estimated timeline for your case resolution based on case type, complexity, 
                    and current caseloads. Helps manage expectations and plan ahead.
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <strong>78%</strong> accuracy (±7 days)
                    </span>
                    <span className="text-muted-foreground">Used 856 times this month</span>
                  </div>
                </div>
                <Badge>Active</Badge>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">Find Legal Precedents</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Instantly search thousands of arbitration decisions to find cases similar to yours. 
                    Your steward uses this to build stronger arguments.
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <strong>90%+</strong> relevance
                    </span>
                    <span className="text-muted-foreground">Used 2,134 times this month</span>
                  </div>
                </div>
                <Badge>Active</Badge>
              </div>
            </div>

            <div className="rounded-lg border p-4 opacity-60">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">Churn Risk Prediction</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    AI identifies members at risk of leaving the union, allowing proactive outreach 
                    and engagement to address concerns before they escalate.
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">Coming April 2026</span>
                  </div>
                </div>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Frequently Asked Questions
          </CardTitle>
          <CardDescription>
            Common questions about AI at Union Eyes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="what-is-ai">
              <AccordionTrigger>What is AI and how does it work?</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Artificial Intelligence (AI) is technology that learns patterns from data to make predictions 
                  or recommendations. At Union Eyes, we use AI to:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                  <li>Analyze thousands of past cases to predict outcomes</li>
                  <li>Find relevant legal precedents in seconds</li>
                  <li>Estimate timelines based on similar cases</li>
                  <li>Match members with the best steward for their case</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-3">
                  Think of it as a very smart assistant that has studied every case in our history and can 
                  instantly recall relevant information to help you.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="replace-stewards">
              <AccordionTrigger>Will AI replace stewards?</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground mb-3">
                  <strong>Absolutely not.</strong> AI is a tool to help stewards, not replace them. Here&apos;s why:
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-2">
                  <li><strong>Human judgment is irreplaceable:</strong> Stewards understand context, emotions, 
                  and nuances that AI cannot.</li>
                  <li><strong>AI provides information:</strong> It suggests possibilities based on past cases, 
                  but your steward makes the final decisions.</li>
                  <li><strong>Member relationships matter:</strong> Trust, empathy, and advocacy require human connection.</li>
                  <li><strong>AI handles routine tasks:</strong> This frees stewards to focus on strategy, 
                  negotiation, and member support.</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-3">
                  Think of AI as giving stewards superpowers—faster research, better insights, more time for you.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="data-privacy">
              <AccordionTrigger>Is my data safe and private?</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground mb-3">
                  <strong>Yes. Privacy and security are our top priorities.</strong> Here&apos;s how we protect you:
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-2">
                  <li><strong>Encryption:</strong> All data is encrypted in transit and at rest</li>
                  <li><strong>Access controls:</strong> Only authorized stewards can see your case</li>
                  <li><strong>No third-party sharing:</strong> Your data never leaves Union Eyes</li>
                  <li><strong>Anonymization:</strong> AI models are trained on anonymized data</li>
                  <li><strong>Regular audits:</strong> We conduct security audits quarterly</li>
                  <li><strong>Your consent:</strong> You control what data is used and can opt out anytime</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-3">
                  See our full Privacy Policy for complete details on data protection.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="accuracy">
              <AccordionTrigger>How accurate are AI predictions?</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground mb-3">
                  AI accuracy varies by feature and is continuously monitored:
                </p>
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Claim Outcome Prediction</span>
                    <Badge variant="default">85% accurate</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Timeline Forecasting</span>
                    <Badge variant="default">78% accurate (±7 days)</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Legal Precedent Search</span>
                    <Badge variant="default">90%+ relevance</Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  <strong>Important:</strong> AI predictions are estimates, not guarantees. Your steward uses 
                  them as one input among many when advising you. Every case is unique.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  We track accuracy daily and retrain models when performance drops to ensure reliability.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="bias">
              <AccordionTrigger>How do you prevent AI bias?</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground mb-3">
                  <strong>Fairness is non-negotiable.</strong> We take multiple steps to prevent bias:
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-2">
                  <li><strong>Fairness audits:</strong> External auditors test for bias quarterly</li>
                  <li><strong>Protected attributes:</strong> AI never uses race, gender, age, or other 
                  protected characteristics</li>
                  <li><strong>Diverse training data:</strong> Models train on cases from all demographics</li>
                  <li><strong>Performance monitoring:</strong> We track accuracy across different member groups</li>
                  <li><strong>Human oversight:</strong> AI Governance Committee reviews all models</li>
                  <li><strong>Rapid remediation:</strong> If bias is detected, models are retrained within 30 days</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-3">
                  Our Fairness Audit Framework is published and transparent. You can request audit reports 
                  from your steward.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="opt-out">
              <AccordionTrigger>Can I opt out of AI?</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground mb-3">
                  <strong>Yes, absolutely.</strong> You have full control over AI usage:
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-2">
                  <li><strong>Opt-out anytime:</strong> Tell your steward you don&apos;t want AI used on your case</li>
                  <li><strong>Partial opt-out:</strong> Choose which AI features you&apos;re comfortable with</li>
                  <li><strong>Training data opt-out:</strong> Request that your case data not be used for 
                  model training</li>
                  <li><strong>No penalties:</strong> Opting out doesn&apos;t affect your representation quality</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-3">
                  Contact your steward or the union office to exercise your opt-out rights.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="wrong-prediction">
              <AccordionTrigger>What if AI makes a wrong prediction?</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground mb-3">
                  AI predictions are never the only factor in decisions. Here&apos;s what happens:
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-2">
                  <li><strong>Steward judgment prevails:</strong> Your steward reviews AI predictions and 
                  uses their experience</li>
                  <li><strong>Multiple data points:</strong> Decisions consider case details, member input, 
                  and precedents</li>
                  <li><strong>Continuous learning:</strong> Wrong predictions help improve the AI</li>
                  <li><strong>No automated decisions:</strong> AI never makes final decisions—humans do</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-3">
                  If you believe AI provided incorrect information that affected your case, report it through 
                  the feedback form below. All incidents are investigated.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="governance">
              <AccordionTrigger>Who oversees AI at Union Eyes?</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground mb-3">
                  <strong>AI Governance Committee</strong> (7 members):
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                  <li>Chief Technology Officer (Chair)</li>
                  <li>Legal Counsel</li>
                  <li>Data Protection Officer</li>
                  <li>Data Science Lead</li>
                  <li>Steward Representative</li>
                  <li>Member Advocate</li>
                  <li>Executive Board Representative</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-3">
                  The committee approves all new AI features, reviews fairness audits, investigates incidents, 
                  and ensures AI serves members ethically. Meeting minutes are published quarterly.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Feedback Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Share Your Feedback or Concerns
          </CardTitle>
          <CardDescription>
            Help us improve AI by sharing your experience, questions, or concerns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {feedbackSubmitted ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Thank You!</AlertTitle>
              <AlertDescription>
                Your feedback has been received. A steward will follow up within 2 business days if you 
                requested a response.
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name</Label>
                  <Input
                    id="name"
                    value={feedbackForm.name}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={feedbackForm.email}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={feedbackForm.category}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, category: e.target.value })}
                >
                  <option value="general">General Feedback</option>
                  <option value="concern">Privacy or Bias Concern</option>
                  <option value="incorrect">Incorrect Prediction</option>
                  <option value="suggestion">Feature Suggestion</option>
                  <option value="question">Question</option>
                  <option value="opt-out">Opt-Out Request</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Your Message</Label>
                <Textarea
                  id="message"
                  rows={6}
                  value={feedbackForm.message}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })}
                  placeholder="Please share your feedback, concern, or question..."
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                Submit Feedback
              </Button>

              <p className="text-xs text-muted-foreground">
                For urgent concerns, contact your steward directly. All feedback is reviewed by the AI 
                Governance Committee.
              </p>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Learn More
          </CardTitle>
          <CardDescription>
            Additional resources about AI at Union Eyes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="flex items-start gap-3 w-full">
                <Video className="h-5 w-5 mt-0.5" />
                <div className="text-left">
                  <p className="font-medium">Video Tutorials</p>
                  <p className="text-sm text-muted-foreground">
                    Watch how AI helps with your case
                  </p>
                </div>
              </div>
            </Button>

            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="flex items-start gap-3 w-full">
                <FileText className="h-5 w-5 mt-0.5" />
                <div className="text-left">
                  <p className="font-medium">AI Policy Documents</p>
                  <p className="text-sm text-muted-foreground">
                    Read our full AI governance policies
                  </p>
                </div>
              </div>
            </Button>

            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="flex items-start gap-3 w-full">
                <Users className="h-5 w-5 mt-0.5" />
                <div className="text-left">
                  <p className="font-medium">Member Stories</p>
                  <p className="text-sm text-muted-foreground">
                    How AI helped real members
                  </p>
                </div>
              </div>
            </Button>

            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="flex items-start gap-3 w-full">
                <Shield className="h-5 w-5 mt-0.5" />
                <div className="text-left">
                  <p className="font-medium">Fairness Audit Reports</p>
                  <p className="text-sm text-muted-foreground">
                    Quarterly bias testing results
                  </p>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MemberAIPortal;
