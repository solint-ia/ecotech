export const DEFAULT_SAFETY_TIPS: string[] = [
  'Leve água suficiente para toda a trilha',
  'Use protetor solar e repelente de insetos',
  'Vista roupas e calçados adequados para caminhada',
  'Avise alguém sobre seu roteiro e horário previsto de retorno',
  'Não alimente nem se aproxime de animais silvestres',
  'Leve seu lixo de volta e preserve o ambiente',
];

export function safetyTipsToString(tips: string[]): string {
  return tips.map((t) => t.trim()).filter(Boolean).join('\n');
}

export function safetyTipsFromString(raw: string | undefined | null): string[] {
  if (!raw || !raw.trim()) return [...DEFAULT_SAFETY_TIPS];
  return raw.split('\n').map((t) => t.trim()).filter(Boolean);
}
