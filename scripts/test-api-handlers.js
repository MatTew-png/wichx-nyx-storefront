const verifySlip = require('../api/verify-slip.js');
const redeemTrueMoney = require('../api/truemoney-redeem.js');
require('dotenv').config();

// Mock Express req/res
function createMockReqRes(body) {
  const req = { method: 'POST', body };
  let statusCode = 200;
  let responseData = null;
  const res = {
    setHeader: () => {},
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => {
          responseData = data;
          return { statusCode, responseData };
        },
        end: () => ({ statusCode, responseData })
      };
    }
  };
  return { req, res, getResult: () => ({ statusCode, responseData }) };
}

async function testEndpoints() {
  console.log('--- 1. Testing /api/verify-slip.js ---');
  const slipRef = 'TEST-API-SLIP-' + Date.now();
  const m1 = createMockReqRes({ amount: 199.00, transRef: slipRef });
  await verifySlip(m1.req, m1.res);
  console.log('Verify slip response 1:', m1.getResult());

  // Duplicate slip test
  const m2 = createMockReqRes({ amount: 199.00, transRef: slipRef });
  await verifySlip(m2.req, m2.res);
  console.log('Verify duplicate slip response 2:', m2.getResult());

  console.log('\n--- 2. Testing /api/truemoney-redeem.js ---');
  const voucherHash = 'vouchertest' + Date.now();
  const m3 = createMockReqRes({ voucherUrl: `https://gift.truemoney.com/campaign/?v=${voucherHash}` });
  await redeemTrueMoney(m3.req, m3.res);
  console.log('TrueMoney response 1:', m3.getResult());

  // Duplicate voucher test
  const m4 = createMockReqRes({ voucherUrl: `https://gift.truemoney.com/campaign/?v=${voucherHash}` });
  await redeemTrueMoney(m4.req, m4.res);
  console.log('TrueMoney duplicate response 2:', m4.getResult());
}

testEndpoints().catch(console.error);
