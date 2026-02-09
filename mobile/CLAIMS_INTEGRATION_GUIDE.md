# Quick Integration Guide - Claims Management

## How to Update Existing Screens

### 1. Update `mobile/app/claims/[id].tsx` (Claim Detail Screen)

**Import the new components and hooks:**

```typescript
import {
  useClaimDetails,
  useClaimComments,
  useClaimDocuments,
  useClaimAction,
} from '@/hooks/useClaims';
import { ClaimTimeline } from '@/components/ClaimTimeline';
import { ClaimComments } from '@/components/ClaimComments';
import { useAuthStore } from '@/store/authStore';

// In the component:
const { id } = useLocalSearchParams();
const { user } = useAuthStore();
const { data: claim, isLoading } = useClaimDetails(id as string);
const { data: commentsData } = useClaimComments(id as string);
const { data: documents } = useClaimDocuments(id as string);
const performAction = useClaimAction(id as string);

// Add tab state for Timeline/Comments/Documents
const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'comments' | 'documents'>(
  'details'
);
```

**Add action handlers:**

```typescript
const handleAppeal = async () => {
  try {
    await performAction.mutateAsync({
      action: 'appeal',
      reason: 'Reason for appeal',
    });
    Alert.alert('Success', 'Appeal submitted successfully');
  } catch (error) {
    Alert.alert('Error', 'Failed to submit appeal');
  }
};

const handleShare = async () => {
  // Use existing share logic or enhance with PDF export
  await Share.share({
    message: `Claim ${claim.claimNumber}: ${claim.title}`,
  });
};
```

**Update the JSX to include tabs:**

```typescript
{/* Tab Navigation */}
<View style={styles.tabs}>
  <TouchableOpacity
    style={[styles.tab, activeTab === 'details' && styles.tabActive]}
    onPress={() => setActiveTab('details')}
  >
    <Text style={[styles.tabText, activeTab === 'details' && styles.tabTextActive]}>
      Details
    </Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[styles.tab, activeTab === 'timeline' && styles.tabActive]}
    onPress={() => setActiveTab('timeline')}
  >
    <Text style={[styles.tabText, activeTab === 'timeline' && styles.tabTextActive]}>
      Timeline
    </Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[styles.tab, activeTab === 'comments' && styles.tabActive]}
    onPress={() => setActiveTab('comments')}
  >
    <Text style={[styles.tabText, activeTab === 'comments' && styles.tabTextActive]}>
      Comments ({commentsData?.items.length || 0})
    </Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[styles.tab, activeTab === 'documents' && styles.tabActive]}
    onPress={() => setActiveTab('documents')}
  >
    <Text style={[styles.tabText, activeTab === 'documents' && styles.tabTextActive]}>
      Documents ({documents?.length || 0})
    </Text>
  </TouchableOpacity>
</View>

{/* Tab Content */}
{activeTab === 'timeline' && (
  <ClaimTimeline activities={claim?.activities || []} />
)}

{activeTab === 'comments' && (
  <ClaimComments
    claimId={id as string}
    comments={commentsData?.items || []}
    currentUserId={user?.id || ''}
    onAddComment={async (content, mentions) => {
      // Use useAddClaimComment hook
    }}
    onEditComment={async (commentId, content) => {
      // Use useUpdateClaimComment hook
    }}
    onDeleteComment={async (commentId) => {
      // Use useDeleteClaimComment hook
    }}
  />
)}
```

---

### 2. Update `mobile/app/claims/new.tsx` (New Claim Form)

**Import validation and hooks:**

```typescript
import { useCreateClaim, useSaveDraft, useDrafts } from '@/hooks/useClaims';
import { createClaimSchema, validateClaimStep } from '@/validation/claims';
import { claimsService } from '@/services/claims';
import { ClaimFormData } from '@/types/claims';

// Add draft state
const [draftId, setDraftId] = useState<string | null>(null);
const { data: drafts } = useDrafts();
const createClaim = useCreateClaim();
const saveDraft = useSaveDraft();
```

**Add auto-save:**

```typescript
useEffect(() => {
  if (draftId) {
    claimsService.startAutosave(draftId, () => ({
      type: claimType,
      title,
      description,
      incidentDate,
      incidentLocation,
      witnesses,
      documents,
    }));
  }

  return () => {
    if (draftId) {
      claimsService.stopAutosave(draftId);
    }
  };
}, [draftId]);
```

**Add step validation:**

```typescript
const handleNext = () => {
  const stepData = getStepData(currentStep);
  const validation = validateClaimStep(currentStep, stepData);

  if (!validation.success) {
    Alert.alert('Validation Error', Object.values(validation.errors)[0][0]);
    return;
  }

  if (currentStep < STEPS.length - 1) {
    setCurrentStep(currentStep + 1);
  } else {
    handleSubmit();
  }
};

const getStepData = (step: number) => {
  switch (step) {
    case 0:
      return { type: claimType };
    case 1:
      return { incidentDate, incidentTime, incidentLocation };
    case 2:
      return { title, description, amount, department, shift };
    case 3:
      return { witnesses };
    case 4:
      return { documents };
    default:
      return {};
  }
};
```

**Update submit handler:**

```typescript
const handleSubmit = async () => {
  setIsSubmitting(true);

  try {
    const formData: ClaimFormData = {
      type: claimType,
      title,
      description,
      incidentDate,
      incidentTime,
      incidentLocation,
      amount: amount ? parseFloat(amount) : undefined,
      department,
      shift,
      witnesses,
      documents,
      priority: 'medium',
    };

    await createClaim.mutateAsync(formData);

    // Clean up draft if exists
    if (draftId) {
      await claimsService.deleteDraft(draftId);
    }

    Alert.alert('Success', 'Claim submitted successfully');
    router.back();
  } catch (error) {
    Alert.alert('Error', 'Failed to submit claim');
  } finally {
    setIsSubmitting(false);
  }
};
```

---

### 3. Create `mobile/app/claims/[id]/edit.tsx` (Edit Claim Screen)

```typescript
import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useClaimDetails, useUpdateClaim } from '@/hooks/useClaims';
import { Alert } from 'react-native';

export default function EditClaimScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { data: claim, isLoading } = useClaimDetails(id as string);
  const updateClaim = useUpdateClaim(id as string);

  // Form state - initialize from claim data
  const [claimType, setClaimType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // ... other fields

  useEffect(() => {
    if (claim) {
      // Only allow editing drafts
      if (claim.status !== 'draft') {
        Alert.alert('Error', 'Only draft claims can be edited');
        router.back();
        return;
      }

      // Pre-fill form
      setClaimType(claim.type);
      setTitle(claim.title);
      setDescription(claim.description);
      // ... set other fields
    }
  }, [claim]);

  const handleSave = async () => {
    try {
      await updateClaim.mutateAsync({
        type: claimType,
        title,
        description,
        // ... other fields
      });

      Alert.alert('Success', 'Claim updated successfully');
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to update claim');
    }
  };

  // Use same form UI as new.tsx
  return (
    // ... same form JSX as new.tsx
  );
}
```

---

### 4. Add Filter Button to Claims List

```typescript
import { ClaimsFilterSheet } from '@/components/ClaimsFilterSheet';
import { useClaimsStore, useActiveFiltersCount } from '@/store/claimsStore';

const { setFilterSheetOpen, isFilterSheetOpen } = useClaimsStore();
const activeFiltersCount = useActiveFiltersCount();

// In header or toolbar:
<TouchableOpacity onPress={() => setFilterSheetOpen(true)}>
  <Ionicons name="filter" size={24} />
  {activeFiltersCount > 0 && (
    <View style={styles.filterBadge}>
      <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
    </View>
  )}
</TouchableOpacity>

// At bottom of JSX:
<ClaimsFilterSheet
  visible={isFilterSheetOpen}
  onClose={() => setFilterSheetOpen(false)}
/>
```

---

### 5. Update Claims List to Use Enhanced ClaimCard

```typescript
import { ClaimCard } from '@/components/ClaimCard';
import { useClaimsList, useDeleteClaim } from '@/hooks/useClaims';
import { useRouter } from 'expo-router';

const { data, isLoading, refetch } = useClaimsList();
const deleteClaim = useDeleteClaim();
const router = useRouter();

// In FlatList:
<FlatList
  data={data?.items || []}
  renderItem={({ item }) => (
    <ClaimCard
      claim={item}
      onPress={() => router.push(`/claims/${item.id}`)}
      onEdit={item.isDraft ? () => router.push(`/claims/${item.id}/edit`) : undefined}
      onDelete={item.isDraft ? () => handleDelete(item.id) : undefined}
      onQuickView={() => handleQuickView(item)}
    />
  )}
  keyExtractor={(item) => item.id}
  onRefresh={refetch}
  refreshing={isLoading}
/>

const handleDelete = async (id: string) => {
  try {
    await deleteClaim.mutateAsync(id);
  } catch (error) {
    Alert.alert('Error', 'Failed to delete claim');
  }
};
```

---

## Testing Steps

1. **Install dependencies:**

   ```bash
   cd mobile
   pnpm install
   ```

2. **Test offline functionality:**
   - Turn off WiFi/Data
   - Create a claim
   - Add comments
   - Turn on connection
   - Verify sync

3. **Test draft auto-save:**
   - Start creating claim
   - Wait 30 seconds
   - Kill app
   - Reopen - should see resume draft modal

4. **Test filters:**
   - Apply multiple filters
   - Verify claim list updates
   - Clear filters

5. **Test swipe actions:**
   - Swipe left on draft claim
   - Tap Edit/Delete
   - Verify actions work

---

## Common Issues & Solutions

### Issue: "Cannot find module '@/types/claims'"

**Solution:** Ensure tsconfig.json has path aliases configured:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Issue: "MMKV is not defined"

**Solution:** Rebuild the app after installing react-native-mmkv:

```bash
cd mobile
pnpm install
npx expo prebuild --clean
npx expo run:android  # or run:ios
```

### Issue: "Swipeable is not working"

**Solution:** Ensure gesture handler is properly setup in index.js:

```javascript
import 'react-native-gesture-handler';
```

---

## Performance Tips

1. **Use React Query devtools** to monitor cache:

   ```typescript
   import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
   ```

2. **Optimize FlatList** with proper memoization:

   ```typescript
   const renderItem = useCallback(({ item }) => (
     <ClaimCard claim={item} ... />
   ), []);
   ```

3. **Lazy load documents** - only fetch when documents tab is active

4. **Debounce search input** - already implemented in useClaimsSearch

5. **Virtual scrolling** for large lists - use FlashList if needed

---

## Next Features to Add

- [ ] Voice-to-text for claim description
- [ ] Document preview/viewer
- [ ] Push notifications for claim updates
- [ ] Bulk actions (mark multiple as resolved)
- [ ] Export claims to PDF
- [ ] Advanced search filters
- [ ] Claim templates
- [ ] Offline indicator in header
