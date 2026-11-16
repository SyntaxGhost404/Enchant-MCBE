/**
 * ||========================================================================================================================||
 * ||                                                                                                                        ||
 * ||  ________  _______   ________  _________  ___  ___  ________  ________  ___  ___  ________  ________  ________         ||
 * || |\   ___ \|\  ___ \ |\   __  \|\___   ___\\  \|\  \|\   __  \|\   __  \|\  \|\  \|\   __  \|\   __  \|\   ___  \       ||
 * ||  \ \  \_|\ \ \   __/|\ \  \|\  \|___ \  \_\ \  \\\  \ \  \|\  \ \  \|\  \ \  \\\  \ \  \|\ /\ \  \|\  \ \  \\ \  \     ||
 * ||   \ \  \ \\ \ \  \_|/_\ \   __  \   \ \  \ \ \   __  \ \   __  \ \   _  _\ \  \\\  \ \   __  \ \   __  \ \  \\ \  \    ||
 * ||    \ \  \_\\ \ \  \_|\ \ \  \ \  \   \ \  \ \ \  \ \  \ \  \ \  \ \  \\  \\ \  \\\  \ \  \|\  \ \  \ \  \ \  \\ \  \   ||
 * ||     \ \_______\ \_______\ \__\ \__\   \ \__\ \ \__\ \__\ \__\ \__\ \__\\ _\\ \_______\ \_______\ \__\ \__\ \__\\ \__\  ||
 * ||      \|_______|\|_______|\|__|\|__|    \|__|  \|__|\|__|\|__|\|__|\|__|\|__|\|_______|\|_______|\|__|\|__|\|__| \|__|  ||
 * ||                                                                                                                        ||
 * ||========================================================================================================================||
 * ||                                                                                                                        ||  
 * ||                                               ★ Please do not modify this code ★                                      ||  
 * ||                                   ► This Mod was created for Minecraft Bedrock Edition ◄                               || 
 * ||                                                                                                                        ||
 * ||========================================================================================================================||
 */

/**
* @made_by Death_Aruban
* @version [1.0.5]
* @link [https://discord.com/invite/NKy9A9RAe8]
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
      if (a.x == b.x && a.y == b.y && a.z == b.z) {
        return true;
      } else {
        return false;
      }
    } else {
      return Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance && Math.abs(a.z - b.z) <= tolerance;
    }
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
    let x = a.x + (b.x - a.x) * t;
    let y = a.y + (b.y - a.y) * t;
    let z = a.z + (b.z - a.z) * t;
    return new Vector3(x, y, z);
  }
  static Dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }
  static Cross(a, b) {
    const x = a.y * b.z - a.z * b.y;
    const y = a.z * b.x - a.x * b.z;
    const z = a.x * b.y - a.y * b.x;
    return new Vector3(x, y, z);
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
    if (magnitude !== 0) {
      return new Vector3(vector.x / magnitude, vector.y / magnitude, vector.z / magnitude);
    } else {
      return new Vector3(0, 0, 0);
    }
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
    return new Vector3(a.x - b.x, a.y - b.y);
  }
  static Divide(a, b) {
    return new Vector3(a.x / b.x, a.y / b.y, a.z / b.z);
  }
  static Scale(vector, scalar) {
    return new Vector2(vector.x * num, vector.y * num);
  }
  static Multiply(a, b) {
    return new Vector2(a.x * b.x, a.y * b.y);
  }
  static Equals(a, b, tolerance) {
    if (tolerance == undefined) {
      if (a.x == b.x && a.y == b.y) {
        return true;
      } else {
        return false;
      }
    } else {
      return Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance;
    }
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
    let x = a.x + (b.x - a.x) * t;
    let y = a.y + (b.y - a.y) * t;
    return new Vector2(x, y);
  }
  static Dot(a, b) {
    return a.x * b.x + a.y * b.y;
  }
  static Magnitude(vector) {
    return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  }
  static SqrMagnitude(vector) {
    return vector.x * vector.x + vector.y * vector.y + vector.z * vector.z;
  }
  static SqrDistance(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return dx * dx + dy * dy;
  }
  static Normalize(vector) {
    const magnitude = Vector2.Magnitude(vector);
    if (magnitude !== 0) {
      return new Vector2(vector.x / magnitude, vector.y / magnitude);
    } else {
      return new Vector2(0, 0);
    }
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
    } else {
      return value;
    }
  }
}

export class Random {
  static Range(min, max) {
    return Mathf.Lerp(min, max, Math.random());
  }
}

export function GetMinMax(a, b) {
  let min = new Vector3(0, 0, 0);
  let max = new Vector3(0, 0, 0);
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
  let result = [min, max];
  return result;
}
