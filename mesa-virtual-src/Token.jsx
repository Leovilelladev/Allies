import { Circle, Group, RegularPolygon, Text } from 'react-konva';

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
        stroke={isSelected ? '#ec3013' : 'rgba(243, 242, 242, 0.55)'}
        strokeWidth={isSelected ? 3 : 1.5}
        shadowColor="black"
        shadowBlur={6}
        shadowOpacity={0.5}
      />
      {/* Marcador de direção: mostra pra onde o token está "olhando" quando gira */}
      <RegularPolygon
        sides={3}
        radius={7}
        y={-token.radius - 3}
        fill="#ec3013"
        stroke="rgba(23, 22, 26, 0.65)"
        strokeWidth={1}
        listening={false}
      />
      <Text
        text={token.label}
        fontFamily="Archivo, system-ui, sans-serif"
        fontSize={13}
        fill="#f3f2f2"
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
