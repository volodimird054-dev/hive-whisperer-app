export function parsePointCoordinates(lat: string, lng: string) {
  const parse = (value: string) => value.trim() ? Number(value.trim().replace(",", ".")) : null;
  const latitude = parse(lat);
  const longitude = parse(lng);
  if (latitude === null && longitude === null) return { lat: null, lng: null };
  if (latitude === null || longitude === null || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new Error("Вкажіть обидві координати: широту від −90 до 90 та довготу від −180 до 180.");
  }
  return { lat: latitude, lng: longitude };
}

export async function getPointLocation(): Promise<{ lat: number; lng: number }> {
  if (!window.isSecureContext) throw new Error("Геолокація доступна лише через HTTPS.");
  if (!navigator.geolocation) throw new Error("Браузер не підтримує геолокацію.");
  const policy = (document as Document & { permissionsPolicy?: { allowsFeature: (feature: string) => boolean }; featurePolicy?: { allowsFeature: (feature: string) => boolean } }).permissionsPolicy
    ?? (document as Document & { featurePolicy?: { allowsFeature: (feature: string) => boolean } }).featurePolicy;
  if (policy && !policy.allowsFeature("geolocation")) {
    throw new Error("У цьому вікні доступ до GPS заблокований. Відкрийте biworldapp.lovable.app в окремій вкладці браузера.");
  }
  const request = (enableHighAccuracy: boolean) => new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy, timeout: 15000, maximumAge: enableHighAccuracy ? 0 : 60000 });
  });
  try {
    let position: GeolocationPosition;
    try {
      position = await request(true);
    } catch (error) {
      if ((error as GeolocationPositionError).code === 1) throw error;
      position = await request(false);
    }
    return { lat: Number(position.coords.latitude.toFixed(6)), lng: Number(position.coords.longitude.toFixed(6)) };
  } catch (error) {
    const code = (error as GeolocationPositionError).code;
    throw new Error(code === 1
      ? "Доступ до місцезнаходження заборонено. Дозвольте його для цього сайту в браузері та увімкніть геолокацію телефона. У вікні перегляду відкрийте biworldapp.lovable.app окремо."
      : code === 2
        ? "Не вдалося визначити місцезнаходження. Увімкніть геолокацію телефона або введіть координати вручну."
        : "Не вдалося отримати координати за відведений час. Спробуйте просто неба або введіть координати вручну.");
  }
}