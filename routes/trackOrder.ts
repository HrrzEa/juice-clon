/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import utils = require('../lib/utils')
import challengeUtils = require('../lib/challengeUtils')
import { type Request, type Response } from 'express'
import * as db from '../data/mongodb'
import { challenges } from '../data/datacache'

module.exports = function trackOrder() {
  return (req: Request, res: Response) => {
    // Truncate id to avoid unintentional RCE
    const id = !utils.isChallengeEnabled(challenges.reflectedXssChallenge) ? String(req.params.id).replace(/[^\w-]+/g, '') : utils.trunc(req.params.id, 50)


    // Further Sanitization for Potential Code Injection
    if (/[^a-zA-Z0-9-_()<>"' ]/.test(String(id))) {
      return res.status(400).json({ error: 'Unsafe characters detected in product ID' });
    }

    challengeUtils.solveIf(challenges.reflectedXssChallenge, () => { return utils.contains(id, '<iframe src="javascript:alert(`xss`)">') })
    db.ordersCollection.find({ $where: `this.orderId === '${id}'` }).then((order: any) => {
      const result = utils.queryResultToJson(order)
      challengeUtils.solveIf(challenges.noSqlOrdersChallenge, () => { return result.data.length > 1 })
      if (result.data[0] === undefined) {
        result.data[0] = { orderId: id }
      }
      res.json(result)
    }, () => {
      res.status(400).json({ error: 'Wrong Param' })
    })
  }
}
