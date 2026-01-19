export function getRandomColor() {
  const colors = [
    "#3B82F6", // bleu
    "#F59E0B", // orange
    "#10B981", // vert
    "#EF4444", // rouge
    "#8B5CF6", // violet
    "#EC4899", // rose
    "#14B8A6", // turquoise
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
