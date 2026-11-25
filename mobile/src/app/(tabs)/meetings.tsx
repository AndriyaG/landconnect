import { CallDialer } from "@/calls/CallDialer";
import { useAuth } from "@/store/auth";
import { Screen } from "@/theme";

export default function MeetingsScreen() {
  const user = useAuth((s) => s.user);
  return <Screen title="Meetings">{user && <CallDialer me={user} />}</Screen>;
}
