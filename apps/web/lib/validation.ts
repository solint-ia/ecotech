// Validation helpers
export const validateCPF = (cpf: string): boolean => {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(clean.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(clean.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.substring(10, 11))) return false;

  return true;
};

export const validateCNPJ = (cnpj: string): boolean => {
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(clean)) return false;

  let size = clean.length - 2;
  let numbers = clean.substring(0, size);
  const digits = clean.substring(size);
  let sum = 0;
  let pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  size = size + 1;
  numbers = clean.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
};

export const validatePhone = (phone: string): boolean => {
  const clean = phone.replace(/\D/g, '');
  if (clean.length !== 10 && clean.length !== 11) return false;
  
  const ddd = parseInt(clean.substring(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  if (clean.substring(0, 1) === '0' || clean.substring(1, 2) === '0') return false;

  if (clean.length === 11) {
    if (clean.charAt(2) !== '9') return false;
  }
  return true;
};

export const validateFullName = (name: string): boolean => {
  const clean = name.trim();
  const parts = clean.split(/\s+/);
  return parts.length >= 2 && parts.every(p => p.length >= 2);
};

// Mask helpers
export const formatPhone = (val: string): string => {
  const clean = val.replace(/\D/g, '');
  if (clean.length <= 2) return clean;
  if (clean.length <= 6) return `(${clean.substring(0, 2)}) ${clean.substring(2)}`;
  if (clean.length <= 10) return `(${clean.substring(0, 2)}) ${clean.substring(2, 6)}-${clean.substring(6)}`;
  return `(${clean.substring(0, 2)}) ${clean.substring(2, 7)}-${clean.substring(7, 11)}`;
};

export const formatCPF = (val: string): string => {
  const clean = val.replace(/\D/g, '').substring(0, 11);
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.substring(0, 3)}.${clean.substring(3)}`;
  if (clean.length <= 9) return `${clean.substring(0, 3)}.${clean.substring(3, 6)}.${clean.substring(6)}`;
  return `${clean.substring(0, 3)}.${clean.substring(3, 6)}.${clean.substring(6, 9)}-${clean.substring(9)}`;
};

export const formatCNPJ = (val: string): string => {
  const clean = val.replace(/\D/g, '').substring(0, 14);
  if (clean.length <= 2) return clean;
  if (clean.length <= 5) return `${clean.substring(0, 2)}.${clean.substring(2)}`;
  if (clean.length <= 8) return `${clean.substring(0, 2)}.${clean.substring(2, 5)}.${clean.substring(5)}`;
  if (clean.length <= 12) return `${clean.substring(0, 2)}.${clean.substring(2, 5)}.${clean.substring(5, 8)}/${clean.substring(8)}`;
  return `${clean.substring(0, 2)}.${clean.substring(2, 5)}.${clean.substring(5, 8)}/${clean.substring(8, 12)}-${clean.substring(12)}`;
};

// Birth date: "DD/MM/AAAA" mask + helpers.
export const formatDateBR = (val: string): string => {
  const clean = val.replace(/\D/g, '').substring(0, 8);
  if (clean.length <= 2) return clean;
  if (clean.length <= 4) return `${clean.substring(0, 2)}/${clean.substring(2)}`;
  return `${clean.substring(0, 2)}/${clean.substring(2, 4)}/${clean.substring(4)}`;
};

export const validateBirthDate = (val: string): boolean => {
  const m = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return false;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  const date = new Date(year, month - 1, day);
  // Reject impossible calendar dates (e.g. 31/02), the future and absurd years.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return false;
  if (date > new Date()) return false;
  if (year < 1900) return false;
  return true;
};

// "DD/MM/AAAA" -> "YYYY-MM-DD" (ISO) for the API. Empty string if incomplete.
export const birthDateToISO = (val: string): string => {
  const m = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return '';
  return `${m[3]}-${m[2]}-${m[1]}`;
};
