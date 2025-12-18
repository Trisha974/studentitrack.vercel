# Deficiency Notifications Feature

## Overview

The system now automatically creates deficiency notifications when students receive grades below the passing threshold. This helps students stay aware of their academic performance and take timely action.

## How It Works

### When Deficiency Notifications Are Created

1. **Grade Creation**: When a professor records a new grade, the system:
   - Creates a standard grade notification
   - Calculates the grade percentage (score/maxPoints × 100)
   - If percentage is below the threshold (default: 75%), creates a deficiency notification

2. **Grade Updates**: When a professor updates an existing grade, the same check is performed

### Deficiency Threshold

- **Default**: 75%
- **Configurable**: Set `DEFICIENCY_THRESHOLD` environment variable in Railway
  - Example: `DEFICIENCY_THRESHOLD=70` (70% threshold)
  - Example: `DEFICIENCY_THRESHOLD=60` (60% threshold)

### Notification Details

**Title**: `{Course Name}: Academic Deficiency Alert`

**Message**: `Your {assessment type} "{assessment title}" score is {score}/{maxPoints} ({percentage}%), which is below the passing threshold. Please review and take necessary action.`

**Example**:
- Title: `Data Structures: Academic Deficiency Alert`
- Message: `Your quiz "Midterm Exam" score is 45/100 (45.0%), which is below the passing threshold. Please review and take necessary action.`

## Configuration

### Set Deficiency Threshold in Railway

1. Go to Railway Dashboard
2. Select your backend service
3. Go to **Variables** tab
4. Add new variable:
   - **Name**: `DEFICIENCY_THRESHOLD`
   - **Value**: `75` (or your desired threshold)
5. Save (Railway will auto-redeploy)

### Default Behavior

If `DEFICIENCY_THRESHOLD` is not set, the system uses **75%** as the default threshold.

## Technical Details

### Implementation

- **Function**: `createDeficiencyNotification()` in `server/src/shared/utils/notificationHelper.js`
- **Triggered by**: `createGradeNotification()` function
- **Notification Type**: Uses `'grade'` type with deficiency-specific title and message
- **Non-blocking**: Deficiency notification failures don't prevent grade creation

### Grade Calculation

```javascript
percentage = (score / maxPoints) × 100
if (percentage < DEFICIENCY_THRESHOLD) {
  createDeficiencyNotification()
}
```

### Example Scenarios

1. **Passing Grade** (80/100 = 80%):
   - ✅ Standard grade notification created
   - ❌ No deficiency notification (above 75% threshold)

2. **Failing Grade** (45/100 = 45%):
   - ✅ Standard grade notification created
   - ✅ Deficiency notification created (below 75% threshold)

3. **Borderline Grade** (75/100 = 75%):
   - ✅ Standard grade notification created
   - ❌ No deficiency notification (exactly at threshold, not below)

## Student Experience

When a student receives a low grade:

1. They receive **two notifications**:
   - Standard grade notification with score details
   - Deficiency notification with alert and percentage

2. Both notifications appear in:
   - Student dashboard notifications panel
   - Notification count badge

3. Students can:
   - View detailed grade information
   - See their percentage score
   - Take action to improve performance

## Testing

To test deficiency notifications:

1. Create a grade with score below threshold:
   - Example: Score = 50, Max Points = 100 (50% < 75%)
   - Should create deficiency notification

2. Create a grade with score above threshold:
   - Example: Score = 80, Max Points = 100 (80% > 75%)
   - Should NOT create deficiency notification

3. Update a grade from passing to failing:
   - Change score from 80 to 50
   - Should create deficiency notification

## Notes

- Deficiency notifications are **non-critical** - if notification creation fails, the grade is still saved
- The threshold applies to **individual grades**, not course averages
- Multiple deficiency notifications can be created if a student has multiple low grades
- Notifications use the existing notification system (same database table, same UI)

