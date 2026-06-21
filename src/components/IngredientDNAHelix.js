import React, { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Svg, { Circle, Line, Defs, LinearGradient as SvgGrad, Stop, Rect } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const NODE_COLORS = {
  good: { primary: '#4ECD78', r: 78, g: 205, b: 120 },
  warn: { primary: '#F0A830', r: 240, g: 168, b: 48 },
  bad:  { primary: '#F05454', r: 240, g: 84, b: 84 },
};

const BG_COLOR = '#0A1A10';

/**
 * IngredientDNAHelix — SVG-based animated double-helix.
 *
 * Uses react-native-svg (works on iOS, Android, AND Web).
 * A continuously scrolling double helix where every ingredient becomes
 * a pair of glowing nodes. Green = safe, amber = moderate, red = harmful
 * with dashed rings. Backbone lines connect sequential dots; bridge lines
 * fade with depth for a 3D feel. Ingredient names float beside nodes.
 */
const IngredientDNAHelix = ({ ingredients = [], height = 480 }) => {
  const canvasWidth = SCREEN_WIDTH - 36;
  const cx = canvasWidth / 2;
  const amp = canvasWidth * 0.24;
  const step = 52;

  const ingList = useMemo(() => {
    if (ingredients.length === 0) {
      return [
        { name: 'Ingredient', type: 'good' },
        { name: 'Ingredient', type: 'warn' },
        { name: 'Ingredient', type: 'bad' },
      ];
    }
    return ingredients;
  }, [ingredients]);

  // Animation: offset increments over time using setInterval for reliability
  const [offset, setOffset] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef(null);

  const togglePause = useCallback(() => {
    setPaused(prev => !prev);
  }, []);

  useEffect(() => {
    if (paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    intervalRef.current = setInterval(() => {
      setOffset(prev => prev + 0.6);
    }, 50); // ~20fps, smooth enough and reliable
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused]);

  const totalNodes = Math.ceil(height / step) + 6;

  // Compute all node data for this frame
  const frameData = useMemo(() => {
    const nodes = [];
    for (let i = 0; i < totalNodes; i++) {
      const ing = ingList[i % ingList.length];
      const col = NODE_COLORS[ing.type] || NODE_COLORS.good;
      const y = i * step - (offset % step);
      const phase = ((i * step + offset) / (step * 2)) * Math.PI * 2;
      const sinV = Math.sin(phase);
      const cosV = Math.cos(phase);
      const sinVR = Math.sin(phase + Math.PI);

      const xL = cx + sinV * amp;
      const xR = cx + sinVR * amp;
      const depthL = (sinV + 1) / 2;          // 0=back, 1=front
      const depthR = (sinVR + 1) / 2;
      const rL = 4 + depthL * 8;              // 4–12px radius
      const rR = 4 + depthR * 8;
      const bridgeOpacity = 0.1 + Math.abs(cosV) * 0.4;

      nodes.push({
        y, phase, xL, xR, depthL, depthR, rL, rR,
        bridgeOpacity,
        col,
        type: ing.type,
        name: ing.name,
      });
    }
    return nodes;
  }, [offset, totalNodes, ingList, cx, amp, step]);

  // Filter visible labels
  const labelData = useMemo(() => {
    return frameData
      .filter(n => n.y > 40 && n.y < height - 40)
      .map(n => {
        const isLeftFront = n.depthL > 0.5;
        return {
          name: n.name,
          type: n.type,
          y: n.y,
          x: isLeftFront ? n.xL + 16 : n.xR + 16,
          opacity: 0.25 + (isLeftFront ? n.depthL : n.depthR) * 0.75,
          col: n.col,
        };
      });
  }, [frameData, height]);

  return (
    <View style={styles.wrapper}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.titleIcon}>
            <Text style={styles.titleIconText}>{'\uD83E\uDDEC'}</Text>
          </View>
          <Text style={styles.title}>Ingredient DNA</Text>
        </View>
        <Text style={styles.subtitle}>Your product's molecular identity</Text>
      </View>

      {/* Pause hint */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={togglePause}
        style={styles.pauseHint}
      >
        <Text style={styles.pauseHintText}>
          {paused ? '▶  Tap to resume' : '❚❚  Tap to pause & read'}
        </Text>
      </TouchableOpacity>

      {/* Helix container */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={togglePause}
        style={{ width: canvasWidth, height, position: 'relative' }}
      >
        <Svg
          width={canvasWidth}
          height={height}
          viewBox={`0 0 ${canvasWidth} ${height}`}
        >
          <Defs>
            <SvgGrad id="fadeTop" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={BG_COLOR} stopOpacity={1} />
              <Stop offset="1" stopColor={BG_COLOR} stopOpacity={0} />
            </SvgGrad>
            <SvgGrad id="fadeBottom" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={BG_COLOR} stopOpacity={0} />
              <Stop offset="1" stopColor={BG_COLOR} stopOpacity={1} />
            </SvgGrad>
          </Defs>

          {/* Backbone lines — connect consecutive dots on each strand */}
          {frameData.slice(0, -1).map((n, i) => {
            const next = frameData[i + 1];
            if (!next) return null;
            return (
              <React.Fragment key={`bb-${i}`}>
                <Line
                  x1={n.xL} y1={n.y} x2={next.xL} y2={next.y}
                  stroke={n.col.primary}
                  strokeWidth={1}
                  opacity={0.08 + n.depthL * 0.22}
                />
                <Line
                  x1={n.xR} y1={n.y} x2={next.xR} y2={next.y}
                  stroke={n.col.primary}
                  strokeWidth={1}
                  opacity={0.08 + n.depthR * 0.22}
                />
              </React.Fragment>
            );
          })}

          {/* Bridge lines + glow + nodes + rings (back layer first) */}
          {frameData.map((n, i) => (
            <React.Fragment key={`node-${i}`}>
              {/* Bridge line */}
              <Line
                x1={n.xL} y1={n.y} x2={n.xR} y2={n.y}
                stroke={`rgba(${n.col.r},${n.col.g},${n.col.b},0.3)`}
                strokeWidth={1}
                opacity={n.bridgeOpacity}
              />

              {/* Left glow */}
              <Circle
                cx={n.xL} cy={n.y} r={n.rL * 3}
                fill={`rgba(${n.col.r},${n.col.g},${n.col.b},0.10)`}
              />
              {/* Left node */}
              <Circle cx={n.xL} cy={n.y} r={n.rL} fill={n.col.primary} />

              {/* Right glow */}
              <Circle
                cx={n.xR} cy={n.y} r={n.rR * 3}
                fill={`rgba(${n.col.r},${n.col.g},${n.col.b},0.10)`}
              />
              {/* Right node */}
              <Circle cx={n.xR} cy={n.y} r={n.rR} fill={n.col.primary} />

              {/* Dashed rings on bad ingredients */}
              {n.type === 'bad' && (
                <>
                  <Circle
                    cx={n.xL} cy={n.y} r={n.rL + 6}
                    fill="none"
                    stroke={`rgba(${n.col.r},${n.col.g},${n.col.b},0.65)`}
                    strokeWidth={1.4}
                    strokeDasharray="4,5"
                  />
                  <Circle
                    cx={n.xR} cy={n.y} r={n.rR + 6}
                    fill="none"
                    stroke={`rgba(${n.col.r},${n.col.g},${n.col.b},0.65)`}
                    strokeWidth={1.4}
                    strokeDasharray="4,5"
                  />
                </>
              )}
            </React.Fragment>
          ))}

          {/* Top fade overlay */}
          <Rect x={0} y={0} width={canvasWidth} height={70} fill="url(#fadeTop)" />
          {/* Bottom fade overlay */}
          <Rect x={0} y={height - 70} width={canvasWidth} height={70} fill="url(#fadeBottom)" />
        </Svg>

        {/* Floating ingredient name labels (React Native text overlay) */}
        {labelData.map((l, i) => {
          const alignRight = l.x > cx;
          return (
            <View
              key={`lbl-${i}`}
              pointerEvents="none"
              style={[
                styles.labelWrap,
                {
                  top: l.y - 8,
                  left: alignRight ? undefined : l.x,
                  right: alignRight ? canvasWidth - l.x + 20 : undefined,
                  opacity: l.opacity,
                },
              ]}
            >
              <Text
                style={[
                  styles.labelText,
                  { color: l.col.primary },
                  alignRight && { textAlign: 'right' },
                ]}
                numberOfLines={1}
              >
                {l.name}
              </Text>
            </View>
          );
        })}
      </TouchableOpacity>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F05454', shadowColor: '#F05454' }]}>
            <View style={styles.legendDotDashed} />
          </View>
          <Text style={styles.legendText}>Harmful</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F0A830', shadowColor: '#F0A830' }]} />
          <Text style={styles.legendText}>Moderate</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4ECD78', shadowColor: '#4ECD78' }]} />
          <Text style={styles.legendText}>Safe</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: BG_COLOR,
    borderRadius: 18,
    overflow: 'hidden',
    marginHorizontal: 18,
    marginBottom: 18,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: 'rgba(78,205,120,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleIconText: {
    fontSize: 15,
  },
  title: {
    fontWeight: '700',
    fontSize: 15,
    color: '#fff',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 3,
    marginLeft: 36,
  },
  pauseHint: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 6,
  },
  pauseHintText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  labelWrap: {
    position: 'absolute',
    maxWidth: 120,
  },
  labelText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  legendDotDashed: {
    position: 'absolute',
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: 'rgba(240,84,84,0.5)',
    borderStyle: 'dashed',
    top: -3,
    left: -3,
  },
  legendText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
});

export default IngredientDNAHelix;
