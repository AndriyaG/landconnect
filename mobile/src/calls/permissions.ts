import { PermissionsAndroid, Platform, type Permission } from "react-native";

const { CAMERA, RECORD_AUDIO, BLUETOOTH_CONNECT } = PermissionsAndroid.PERMISSIONS;
const GRANTED = PermissionsAndroid.RESULTS.GRANTED;

export async function requestCallPermissions(video: boolean): Promise<boolean> {
  const required: Permission[] = video ? [RECORD_AUDIO, CAMERA] : [RECORD_AUDIO];
  const optional: Permission[] = Number(Platform.Version) >= 31 ? [BLUETOOTH_CONNECT] : [];
  const result = await PermissionsAndroid.requestMultiple([...required, ...optional]);
  return required.every((p) => result[p] === GRANTED);
}

export function permissionDeniedMessage(video: boolean): string {
  return video
    ? "Camera and microphone permission are required for video calls. Enable them in Settings > Apps > LandConnect > Permissions."
    : "Microphone permission is required for audio calls. Enable it in Settings > Apps > LandConnect > Permissions.";
}
