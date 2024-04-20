import {DocumentSource} from './@types/DocumentSource'
import {PasswordHandler} from './@types/PasswordHandler'
import {Transaction} from './@types/Transaction'

import {parseKasikornCreditStatement} from './parsers/kasikorn.credit'
import {parseKTCCreditStatement} from './parsers/ktc.credit'
import {parseCitibankCreditStatement} from './parsers/citibank.credit'

import {extractTextChunksFromPDF} from './utils/extractTextChunksFromPDF'
import {parseKasikornBankStatement} from './parsers/kasikorn.statement'

const bankTypes = ['kasikorn', 'ktc', 'citibank'] as const

export type Bank = (typeof bankTypes)[number]

export type StatementType = 'credit' | 'account'

export type {Transaction} from './@types/Transaction'

const PATTERN_CREDIT = /(CREDIT CARD)/
const isCredit = (s: string) => PATTERN_CREDIT.test(s) && s.includes('.')

const findStatementType = (s: string): StatementType => {
  return isCredit(s) ? 'credit' : 'account'
}

const findBankType = (s: string): Bank => {
  const lowerString = s.toLowerCase()

  const foundBankIndexes = bankTypes.map(bank => {
    const idx = lowerString.indexOf(bank)
    return idx >= 0 ? idx : 1_000_000
  })

  const minimumFoundBankIdx = Math.min(...foundBankIndexes)

  const bankIdx = foundBankIndexes.indexOf(minimumFoundBankIdx)
  const foundBank = bankTypes[bankIdx]

  return foundBank
}

export async function parseStatement(
  source: DocumentSource,
  passwordHandler: PasswordHandler
): Promise<Transaction[]> {
  const rawChunks = await extractTextChunksFromPDF(source, passwordHandler)
  const rawString = rawChunks.flat().join('')
  const type = findStatementType(rawString)
  const bank = findBankType(rawString)

  if (type === 'credit') {
    if (bank === 'kasikorn') return parseKasikornCreditStatement(rawChunks)
    if (bank === 'ktc') return parseKTCCreditStatement(rawChunks)
    if (bank === 'citibank') return parseCitibankCreditStatement(rawChunks)
  }

  if (type === 'account') {
    if (bank === 'kasikorn') return parseKasikornBankStatement(rawChunks)
  }

  throw new Error('statement type or bank is not supported')
}
