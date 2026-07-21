const SHAPES = [
  { kind: "square", size: 26, color: "#ff6b6b", top: "4%", right: "3%", duration: "4s", delay: "0s", rotate: "15deg", opacity: 0.4 },
  { kind: "circle", size: 16, color: "#4ecdc4", top: "12%", left: "2%", duration: "3.4s", delay: "0.4s", opacity: 0.35 },
  { kind: "triangle", size: 20, color: "#a78bfa", top: "20%", right: "4%", duration: "5s", delay: "0.2s", opacity: 0.35 },
  { kind: "square", size: 30, color: "#ffd166", top: "30%", left: "3%", duration: "4.6s", delay: "0.6s", rotate: "-10deg", opacity: 0.35 },
  { kind: "circle", size: 14, color: "#ff6b6b", top: "38%", right: "2%", duration: "3s", delay: "0s", opacity: 0.35 },
  { kind: "circle", size: 18, color: "#a78bfa", top: "46%", left: "4%", duration: "3.8s", delay: "0.8s", opacity: 0.35 },
  { kind: "triangle", size: 18, color: "#4ecdc4", top: "54%", right: "3%", duration: "4.2s", delay: "0.3s", opacity: 0.32 },
  { kind: "square", size: 22, color: "#a78bfa", top: "62%", left: "2%", duration: "4.8s", delay: "0.5s", rotate: "8deg", opacity: 0.32 },
  { kind: "circle", size: 16, color: "#ffd166", top: "70%", right: "4%", duration: "3.6s", delay: "0.1s", opacity: 0.3 },
  { kind: "circle", size: 12, color: "#ff6b6b", top: "78%", left: "3%", duration: "3.2s", delay: "0.7s", opacity: 0.3 },
  { kind: "triangle", size: 16, color: "#ffd166", top: "86%", right: "2%", duration: "4.4s", delay: "0.4s", opacity: 0.3 },
  { kind: "square", size: 20, color: "#4ecdc4", top: "94%", left: "4%", duration: "3.9s", delay: "0.2s", rotate: "-6deg", opacity: 0.3 },
  { kind: "circle", size: 10, color: "#a78bfa", top: "8%", right: "9%", duration: "3.1s", delay: "0.6s", opacity: 0.28 },
  { kind: "circle", size: 10, color: "#4ecdc4", top: "58%", left: "9%", duration: "3.7s", delay: "0.3s", opacity: 0.28 },
];

const Shape = ({ kind, size, color, top, left, right, duration, delay, rotate, opacity }) => {
  const style = {
    position: "absolute",
    top,
    left,
    right,
    opacity: opacity ?? 1,
    animation: `shapes-drift ${duration} ease-in-out infinite`,
    animationDelay: delay,
  };

  if (kind === "triangle") {
    return (
      <div
        style={{
          ...style,
          width: 0,
          height: 0,
          borderLeft: `${size / 2}px solid transparent`,
          borderRight: `${size / 2}px solid transparent`,
          borderBottom: `${size}px solid ${color}`,
        }}
      />
    );
  }

  return (
    <div
      style={{
        ...style,
        width: size,
        height: size,
        background: color,
        borderRadius: kind === "circle" ? "50%" : "10px",
        transform: rotate ? `rotate(${rotate})` : undefined,
      }}
    />
  );
};

const Shapes = () => (
  <div className='fixed inset-0 pointer-events-none overflow-hidden z-0'>
    {SHAPES.map((shape, index) => (
      <Shape key={index} {...shape} />
    ))}
  </div>
);

export default Shapes;
