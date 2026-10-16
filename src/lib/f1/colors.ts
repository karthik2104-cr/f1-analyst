export const DRIVER_PALETTE = [
  "#E10600",
  "#5B9DFF",
  "#2DD4A7",
  "#F5B942",
  "#F4F6FA",
  "#C084FC",
  "#FB923C",
  "#67E8F9",
  "#F472B6",
  "#A3E635",
];

export const CONSTRUCTOR_COLORS: Record<string, string> = {
  mercedes: "#27f4d2",
  ferrari: "#e8002d",
  red_bull: "#3671c6",
  mclaren: "#ff8000",
  aston_martin: "#229971",
  alpine: "#ff87bc",
  williams: "#64c4ff",
  rb: "#6692ff",
  racing_bulls: "#6692ff",
  sauber: "#52e252",
  kick_sauber: "#52e252",
  haas: "#b6babd",
  alphatauri: "#5e8faa",
  alfa: "#9b0000",
  alpharomeo: "#9b0000",
  renault: "#fff500",
  force_india: "#f596c8",
  racing_point: "#f596c8",
  toro_rosso: "#469bff",
  brawn: "#c6ff00",
  bmw_sauber: "#d0d0d0",
  toyota: "#eb0000",
  honda: "#e8e8e8",
  jordan: "#ffd100",
  jaguar: "#00785a",
};

export function driverColor(index: number): string {
  return DRIVER_PALETTE[index % DRIVER_PALETTE.length];
}

export function constructorColor(id: string, index = 0): string {
  return CONSTRUCTOR_COLORS[id] ?? driverColor(index);
}
