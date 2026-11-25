# Demo script

Two Android phones, about six minutes. Phone A is the seller. Phone B is the buyer. Use the preview APK on both, against `https://landconnect-zqhr.onrender.com/`.

Register new accounts during the demo. The seeded users in the README are optional and are not required for this script.

## 0:00 Register

Phone A: Create account, role Seller, name, email, password of at least 8 characters.

Phone B: Create account, role Buyer.

Each phone lands on Community. Sellers see a + button. Buyers do not.

## 0:45 Create a listing

Phone A: tap +, then fill the form.

- Title, price in whole rupees, area, unit, land type, short address.
- On the map, tap to drop the pin, or use the location button. Saving requires a pin.
- Add a photo if you want. It uploads when you save.

Save. The listing appears under My listings and on Community.

## 1:30 Browse and filter

Phone B: Community. Type part of the title into search. Pick a price chip such as Under ₹50L or ₹1 – 2Cr. Clear the filters so the new listing is visible. Pull to refresh if it is missing. Open the listing.

## 2:15 Map

Phone B: Map tab. Pan until the pin's price label is on screen. Tap it. The listing opens again. The detail screen shows a small map of the same pin.

## 3:00 Chat

Phone B: on the listing, tap Message. The chat opens with the seller's name.

Send a short message, for example "Is this still available?". Phone A: Chats tab, open the thread, reply.

If you type a phone number, the composer warns that it will be hidden. The stored text keeps only the last two digits.

## 3:45 Audio call

Phone B: in the chat header, tap the phone icon. Allow the microphone if asked.

Phone A: incoming audio call. Tap Accept. Confirm you can hear each other. Either phone taps End.

## 4:30 Video call, then reject

Phone A: tap the video icon. Allow the camera if asked.

Phone B: incoming video call. Tap Reject. Phone A returns to the chat. The call does not connect.

## 5:00 Block

Phone A: chat menu (the vertical dots), Block user, confirm.

Phone B: send another message, or tap the phone icon. The send fails, or the call alert says you cannot place the call because one of you blocked the other.

Phone A: Profile shows the buyer under Blocked. Tap Unblock so the meeting invite in the next step is allowed.

## 5:20 Meeting

Phone A: Meetings, +, title, date as `YYYY-MM-DD`, time as `HH:MM`. The buyer appears under Invite from chats because you already messaged. Check the buyer. Create meeting.

Both phones: Meetings, pull to refresh, tap Join on that meeting. Allow camera and microphone. You should see and hear each other. Tap End.

Profile on either phone lists the earlier audio and video calls. The meeting is not in that list.

## Pre-demo checklist

- Preview APK installed on both phones, built with the Render URL in `eas.json`.
- Open `https://landconnect-zqhr.onrender.com/health` about a minute before you start. Wait until it returns `{"status": "ok"}`.
- Camera, microphone, and location already granted, so the first call and the map pin do not stop for a system dialog. If a dialog appears, that is fine. Allow it.
- Both phones on a stable network that can reach Render and Stream.
- A second screen recording ready, in case the live network or a cold start eats a minute.
