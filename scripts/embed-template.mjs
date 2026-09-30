// templates/rental-form.hwpx → lib/rental-form-template.ts (base64 내장) 갱신 스크립트
import { readFileSync, writeFileSync } from 'node:fs'
const b64 = readFileSync('templates/rental-form.hwpx').toString('base64')
writeFileSync('lib/rental-form-template.ts',
  `// 기본 내장 신청서 서식(templates/rental-form.hwpx)을 base64로 포함. 서버리스 배포 시 파일 경로 의존 제거.\n` +
  `// 갱신: node scripts/embed-template.mjs\n` +
  `export const DEFAULT_TEMPLATE_NAME = '수학교구 대여 신청서(기본).hwpx'\n` +
  `export const DEFAULT_TEMPLATE_BASE64 =\n  '${b64}'\n`)
console.log('updated lib/rental-form-template.ts', b64.length, 'chars')
