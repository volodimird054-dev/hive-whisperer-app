import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Loader2, MapPin } from "lucide-react";
import { geocodeAddress } from "@/lib/weather";
import { PointWeather } from "./point-weather";

type Props = {
  pointId: string;
  lat: number | null;
  lng: number | null;
  address: string | null;
};

/** Shows weather for the point address; GPS coords are only a fallback. */
export function PointWeatherAuto({ pointId, lat, lng, address }: Props) {
  const hasAddress = !!address?.trim();
  const hasCoords = lat != null && lng != null;

  const { data: geo, isLoading } = useQuery({
    queryKey: ["geocode", address],
    queryFn: () => geocodeAddress(address ?? ""),
    enabled: hasAddress,
    staleTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (!hasAddress && hasCoords) {
    return <PointWeather lat={lat as number} lng={lng as number} pointId={pointId} />;
  }

  if (!hasAddress) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        Вкажіть адресу або GPS-координати, щоб бачити погоду й пасічницький прогноз для цього точка.
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-6 flex items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Визначаємо погоду за адресою…
      </Card>
    );
  }

  if (!geo) {
    if (hasCoords) {
      return <PointWeather lat={lat as number} lng={lng as number} pointId={pointId} />;
    }
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        Не вдалося знайти «{address}» на карті. Уточніть адресу або додайте GPS-координати.
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <MapPin className="w-3 h-3" /> Погода за адресою: {geo.label}
      </div>
      <PointWeather lat={geo.lat} lng={geo.lng} pointId={pointId} />
    </div>
  );
}
