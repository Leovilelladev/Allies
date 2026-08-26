import { Circle, Group, Text } from 'react-konva';

// Paleta de cores dos tokens, ciclando por índice (sem depender de imagem/token art ainda)
const PALETTE = ['#7c2d2d', '#2d5a3d', '#2d4a7c', '#6b3d7c', '#7c5a2d', '#2d6b6b'];

export function tokenColor(index) {
  return PALETTE[index % PALETTE.length];
}

export default function Token({ token, isSelected, onSelect, onDragEnd, shapeRef }) {
  return (
    <Group
      ref={shapeRef}
      x={token.x}
      y={token.y}
      rotation={token.rotation}
      scaleX={token.scaleX}
      scaleY={token.scaleY}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onDragEnd(token.id, e.target.x(), e.target.y())}
    >
      <Circle
        radius={token.radius}
        fill={token.color}
        stroke={isSelected ? '#c79f57' : 'rgba(235, 224, 195, 0.6)'}
        strokeWidth={isSelected ? 3 : 1.5}
        shadowColor="black"
        shadowBlur={6}
        shadowOpacity={0.5}
      />
      <Text
        text={token.label}
        fontFamily="'JetBrains Mono', monospace"
        fontSize={13}
        fill="#ebe0c3"
        width={token.radius * 2}
        height={token.radius * 2}
        align="center"
        verticalAlign="middle"
        offsetX={token.radius}
        offsetY={token.radius}
        listening={false}
      />
    </Group>
  );
}
