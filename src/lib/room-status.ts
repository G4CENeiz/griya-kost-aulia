/**
 * The room status of the glossary. Two of the three values are derived, so the
 * database stores only the part the admin sets.
 */
export type RoomStatus = 'available' | 'occupied' | 'unavailable'

export function roomStatus(input: { isUnavailable: boolean; activeTenancies: number }): RoomStatus {
  if (input.activeTenancies > 0) return 'occupied'
  return input.isUnavailable ? 'unavailable' : 'available'
}

export const ROOM_STATUS_LABEL: Record<RoomStatus, string> = {
  available: 'Tersedia',
  occupied: 'Terisi',
  unavailable: 'Tidak tersedia',
}

export const ROOM_STATUS_VARIANT: Record<RoomStatus, 'default' | 'secondary' | 'outline'> = {
  available: 'secondary',
  occupied: 'default',
  unavailable: 'outline',
}
