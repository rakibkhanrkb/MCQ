export function safeCloneForSerialization(val: any, seen: WeakSet<any> = new WeakSet()): any {
  if (val === null || val === undefined) {
    return val;
  }
  
  const type = typeof val;
  if (type !== 'object' && type !== 'function') {
    return val;
  }
  
  if (type === 'function') {
    return `[Function: ${val.name || 'anonymous'}]`;
  }
  
  if (seen.has(val)) {
    return '[Circular Reference]';
  }
  
  seen.add(val);
  
  // Date objects
  if (val instanceof Date) {
    return val.toISOString();
  }
  
  // Error objects
  if (val instanceof Error) {
    const errObj: any = {
      name: val.name || 'Error',
      message: val.message,
      stack: val.stack
    };
    if ('code' in val) errObj.code = (val as any).code;
    return errObj;
  }

  // DOM Elements / Event / Window / Document
  if (typeof window !== 'undefined') {
    if (val === window) return '[Window]';
    if (val === document) return '[Document]';
    if (val instanceof Event) return `[Event: ${val.type}]`;
    if (val.nodeType && val.nodeName) {
      return `[Element: ${val.nodeName}]`;
    }
  }

  // Handle Firestore/Firebase internal timestamps
  if (val.constructor && (val.constructor.name === 'Timestamp' || val.constructor.name === '_Timestamp')) {
    if (typeof val.toDate === 'function') {
      try {
        return val.toDate().toISOString();
      } catch (e) {}
    }
    if (typeof val.seconds === 'number') {
      return { seconds: val.seconds, nanoseconds: val.nanoseconds || 0 };
    }
  }

  // Arrays
  if (Array.isArray(val)) {
    return val.map(item => safeCloneForSerialization(item, seen));
  }
  
  // For other class instances (excluding generic Object)
  if (val.constructor && val.constructor !== Object) {
    const className = val.constructor.name;
    // If it's a Firestore DocumentReference, Query, etc. or minified class name of 1-2 chars
    if (
      className && 
      (className.length === 1 || 
       className.length === 2 || 
       className.includes('Firestore') || 
       className.includes('DocumentReference') ||
       className.includes('Query') ||
       className.includes('Transaction') ||
       className.includes('Database') ||
       className.includes('Auth') ||
       className.includes('Firebase'))
    ) {
      return `[${className}]`;
    }
  }
  
  // Plain objects
  const cloned: any = {};
  for (const key of Object.getOwnPropertyNames(val)) {
    try {
      const propValue = val[key];
      cloned[key] = safeCloneForSerialization(propValue, seen);
    } catch (err) {
      cloned[key] = `[Unserializable: ${err instanceof Error ? err.message : String(err)}]`;
    }
  }
  
  // Remove from seen for other sibling branches
  seen.delete(val);
  
  return cloned;
}

export function safeJsonStringify(obj: any): string {
  try {
    const cloned = safeCloneForSerialization(obj);
    return JSON.stringify(cloned);
  } catch (err) {
    console.error("Critical fallback in safeJsonStringify:", err);
    return `{"error": "Stringification failed", "message": "${err instanceof Error ? err.message : String(err)}"}`;
  }
}

