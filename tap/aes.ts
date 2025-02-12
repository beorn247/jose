import type QUnit from 'qunit'
import * as env from './env.js'
import type * as jose from '../src/index.js'
import random from './random.js'
import * as roundtrip from './encrypt.js'

export default (QUnit: QUnit, lib: typeof jose) => {
  const { module, test } = QUnit
  module('aes.ts')

  type Vector = [string, boolean]
  const algorithms: Vector[] = [
    ['A128GCM', true],
    ['A192GCM', !env.isChromium],
    ['A256GCM', true],
    ['A128CBC-HS256', true],
    ['A192CBC-HS384', !env.isChromium],
    ['A256CBC-HS512', true],
  ]

  function title(vector: Vector) {
    const [enc, works] = vector
    let result = ''
    if (!works) {
      result = '[not supported] '
    }
    result += `${enc}`
    return result
  }

  function secretsFor(enc: string) {
    return [
      lib.generateSecret(enc),
      random(parseInt(enc.endsWith('GCM') ? enc.slice(1, 4) : enc.slice(-3)) >> 3),
    ]
  }

  for (const vector of algorithms) {
    const [enc, works] = vector

    const execute = async (t: typeof QUnit.assert) => {
      for await (const secret of secretsFor(enc)) {
        await roundtrip.jwe(t, lib, 'dir', enc, secret)
      }
    }

    const jwt = async (t: typeof QUnit.assert) => {
      await roundtrip.jwt(t, lib, 'dir', enc, await secretsFor(enc)[0])
    }

    if (works) {
      test(title(vector), execute)
      test(`${title(vector)} JWT`, jwt)
    } else {
      test(title(vector), async (t) => {
        await t.rejects(execute(t))
      })
    }
  }
}
