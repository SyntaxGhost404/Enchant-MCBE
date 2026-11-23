/**
 * Enchant+ 1.1.1 for Minecraft: Bedrock Edition 26.60+
 * Small vector and math helpers.
 *
 * Based on Enchant+ by Death_Aruban: https://github.com/DeathAruban/Enchant-MCBE
 */

export class Vector3 {
  x = 0;
  y = 0;
  z = 0;

  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  static Add(a, b) {
    return new Vector3(a.x + b.x, a.y + b.y, a.z + b.z);
  }

  static Subtract(a, b) {
    return new Vector3(a.x - b.x, a.y - b.y, a.z - b.z);
  }

  static Divide(a, b) {
    return new Vector3(a.x / b.x, a.y / b.y, a.z / b.z);
  }

  static Scale(vector, scalar) {
    return new Vector3(vector.x * scalar, vector.y * scalar, vector.z * scalar);
  }

  static Multiply(a, b) {
    return new Vector3(a.x * b.x, a.y * b.y, a.z * b.z);
  }

  static Equals(a, b, tolerance) {
    if (tolerance == undefined) {
      return a.x == b.x && a.y == b.y && a.z == b.z;
    }
    return Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance && Math.abs(a.z - b.z) <= tolerance;
  }

  static Zero() {
    return new Vector3(0, 0, 0);
  }

  static Up() {
    return new Vector3(0, 1, 0);
  }

  static Down() {
    return new Vector3(0, -1, 0);
  }

  static Forward() {
    return new Vector3(0, 0, 1);
  }

  static Back() {
    return new Vector3(0, 0, -1);
  }

  static Left() {
    return new Vector3(-1, 0, 0);
  }

  static Right() {
    return new Vector3(1, 0, 0);
  }

  static Distance(a, b) {
    return Math.abs(a.x - b.x) + 1 + (Math.abs(a.y - b.y) + 1) + (Math.abs(a.z - b.z) + 1);
  }

  static Lerp(a, b, t) {
    return new Vector3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
  }

  static Dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  static Cross(a, b) {
    return new Vector3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
  }

  static Magnitude(vector) {
    return Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
  }

  static SqrMagnitude(vector) {
    return vector.x * vector.x + vector.y * vector.y + vector.z * vector.z;
  }

  static SqrDistance(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    return dx * dx + dy * dy + dz * dz;
  }

  static Normalize(vector) {
    const magnitude = Vector3.Magnitude(vector);
    return magnitude !== 0 ? new Vector3(vector.x / magnitude, vector.y / magnitude, vector.z / magnitude) : new Vector3(0, 0, 0);
  }
}

export class Vector2 {
  x = 0;
  y = 0;

  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  static Add(a, b) {
    return new Vector2(a.x + b.x, a.y + b.y);
  }

  static Subtract(a, b) {
    return new Vector2(a.x - b.x, a.y - b.y);
  }

  static Divide(a, b) {
    return new Vector2(a.x / b.x, a.y / b.y);
  }

  static Scale(vector, scalar) {
    return new Vector2(vector.x * scalar, vector.y * scalar);
  }

  static Multiply(a, b) {
    return new Vector2(a.x * b.x, a.y * b.y);
  }

  static Equals(a, b, tolerance) {
    if (tolerance == undefined) {
      return a.x == b.x && a.y == b.y;
    }
    return Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance;
  }

  static Zero() {
    return new Vector2(0, 0);
  }

  static One() {
    return new Vector2(1, 1);
  }

  static Up() {
    return new Vector2(0, 1);
  }

  static Down() {
    return new Vector2(0, -1);
  }

  static Left() {
    return new Vector2(-1, 0);
  }

  static Distance(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  static Lerp(a, b, t) {
    return new Vector2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  }

  static Dot(a, b) {
    return a.x * b.x + a.y * b.y;
  }

  static Magnitude(vector) {
    return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  }

  static SqrMagnitude(vector) {
    return vector.x * vector.x + vector.y * vector.y;
  }

  static SqrDistance(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return dx * dx + dy * dy;
  }

  static Normalize(vector) {
    const magnitude = Vector2.Magnitude(vector);
    return magnitude !== 0 ? new Vector2(vector.x / magnitude, vector.y / magnitude) : new Vector2(0, 0);
  }
}

export class Mathf {
  static Clamp(value, min, max) {
    if (value >= min && value <= max) {
      return value;
    }
    if (value >= max) {
      return max;
    }
    if (value <= min) {
      return min;
    }
  }

  static Lerp(a, b, t) {
    return a + (b - a) * t;
  }

  static Abs(value) {
    if (value < 0) {
      return value * -1;
    }
    return value;
  }
}

export class Random {
  static Range(min, max) {
    return Mathf.Lerp(min, max, Math.random());
  }
}

export function GetMinMax(a, b) {
  const min = new Vector3(0, 0, 0);
  const max = new Vector3(0, 0, 0);
  if (a.x >= b.x) {
    max.x = a.x;
    min.x = b.x;
  } else {
    min.x = a.x;
    max.x = b.x;
  }
  if (a.y >= b.y) {
    max.y = a.y;
    min.y = b.y;
  } else {
    min.y = a.y;
    max.y = b.y;
  }
  if (a.z >= b.z) {
    max.z = a.z;
    min.z = b.z;
  } else {
    min.z = a.z;
    max.z = b.z;
  }
  return [min, max];
}
