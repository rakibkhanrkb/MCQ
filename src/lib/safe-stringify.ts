export function safeJsonStringify(obj: any): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (value && typeof value === 'object') {
      if (seen.has(value)) {
        return undefined; // skip circular references
      }
      seen.add(value);
      
      // Look for Firestore internal minified classes (like Q, Sa, etc.) or standard SDK instances
      const constructorName = value.constructor?.name;
      if (
        constructorName && 
        (constructorName.length === 1 || 
         constructorName.length === 2 || 
         constructorName.includes('Firestore') || 
         constructorName.includes('DocumentReference') ||
         constructorName.includes('Query') ||
         constructorName.includes('Transaction') ||
         constructorName.includes('Database'))
      ) {
        return undefined; // omit internal complex objects
      }
    }
    return value;
  });
}
