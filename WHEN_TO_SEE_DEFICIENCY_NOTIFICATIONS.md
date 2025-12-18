# When Can You See Deficiency Notifications?

## 📅 When Deficiency Notifications Are Created

Deficiency notifications are **automatically created** when:

1. **A professor records a new grade** for a student
2. **The grade percentage is below 75%** (or your configured threshold)
3. **The grade is successfully saved** to the database

### Example Scenarios

**Scenario 1: Low Grade Recorded**
- Professor records: Score = 45, Max Points = 100
- Percentage: 45% (below 75% threshold)
- ✅ **Deficiency notification is created immediately**

**Scenario 2: Passing Grade Recorded**
- Professor records: Score = 80, Max Points = 100
- Percentage: 80% (above 75% threshold)
- ✅ Regular grade notification created
- ❌ No deficiency notification (grade is passing)

**Scenario 3: Grade Updated**
- Professor updates grade from 80 to 50
- New percentage: 50% (below 75% threshold)
- ✅ **Deficiency notification is created**

## 👀 Where to See Deficiency Notifications

### Student Dashboard

1. **Log in** to your student account
2. **Go to Student Dashboard** (`/student` route)
3. **Look for the Notifications section** (usually a bell icon or notifications panel)
4. **Deficiency notifications will appear** with:
   - Title: `{Course Name}: Academic Deficiency Alert`
   - Message: Shows your score, percentage, and action message
   - Example: "Your quiz 'Midterm Exam' score is 45/100 (45.0%), which is below the passing threshold. Please review and take necessary action."

### Notification Display

Deficiency notifications appear:
- ✅ **Immediately** after a professor records a low grade
- ✅ **In the notifications list** on your dashboard
- ✅ **With a badge/count** showing unread notifications
- ✅ **Marked as unread** until you view them

## 🔄 How Often Are They Created?

- **Every time** a professor records a grade below 75%
- **Every time** a professor updates a grade to below 75%
- **Not created** if grade is 75% or above
- **Not created** if grade is already below 75% and not changed

## ⚙️ Configuration

### Default Threshold: 75%

If you want to change when deficiency notifications are created:

1. **Go to Railway Dashboard**
2. **Backend Service → Variables**
3. **Add/Update**: `DEFICIENCY_THRESHOLD = 70` (or your desired %)
4. **Save** (Railway will auto-redeploy)

### Examples:
- `DEFICIENCY_THRESHOLD = 70` → Notifications for grades below 70%
- `DEFICIENCY_THRESHOLD = 60` → Notifications for grades below 60%
- `DEFICIENCY_THRESHOLD = 75` → Notifications for grades below 75% (default)

## 📊 Real-Time Updates

Notifications appear:
- ✅ **Automatically** when created (no page refresh needed if polling is enabled)
- ✅ **On next page load** if you're not on the dashboard
- ✅ **In the notification count badge** showing unread count

## 🧪 How to Test

### Test Deficiency Notification Creation:

1. **As Professor:**
   - Record a grade: Score = 50, Max Points = 100
   - This creates a deficiency notification (50% < 75%)

2. **As Student:**
   - Log in to student account
   - Go to dashboard
   - Check notifications panel
   - You should see: "Academic Deficiency Alert"

### Test No Deficiency Notification:

1. **As Professor:**
   - Record a grade: Score = 80, Max Points = 100
   - This does NOT create a deficiency notification (80% > 75%)

2. **As Student:**
   - Check notifications
   - You should see regular grade notification only
   - No deficiency alert

## ❓ Troubleshooting

### "I don't see deficiency notifications"

**Check:**
1. ✅ Is the grade below 75%? (Check score/maxPoints percentage)
2. ✅ Is the notification system working? (Check for regular grade notifications)
3. ✅ Are you logged in as the correct student?
4. ✅ Check browser console for errors
5. ✅ Check Railway logs for notification creation errors

### "Notifications not appearing"

**Possible causes:**
1. **Polling disabled** - Refresh the page
2. **Database connection issue** - Check Railway logs
3. **Notification creation failed** - Check backend logs (non-critical, won't block grade creation)

## 📝 Summary

**You can see deficiency notifications:**
- ✅ **Immediately** after a professor records a grade below 75%
- ✅ **In your student dashboard** notifications panel
- ✅ **With a clear alert** showing your percentage and course
- ✅ **Every time** a low grade is recorded or updated

**The notification will show:**
- Course name
- Assessment type and title
- Your score (e.g., 45/100)
- Your percentage (e.g., 45.0%)
- Action message to review and take necessary action

