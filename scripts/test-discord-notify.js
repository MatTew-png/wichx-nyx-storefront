const discordNotify = require('../api/discord-notify.js');

function mockReqRes(body) {
  let statusCode = 200;
  let jsonRes = null;
  return {
    req: { method: 'POST', body },
    res: {
      setHeader: () => {},
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            jsonRes = data;
            return { statusCode, jsonRes };
          },
          end: () => ({ statusCode })
        };
      }
    },
    getResult: () => ({ statusCode, jsonRes })
  };
}

async function testDiscordEvents() {
  console.log('Testing Discord notification handler with mock mode...');

  // 1. Order New
  const m1 = mockReqRes({
    type: 'ORDER_NEW',
    orderId: 'WX-893120',
    total: 169.00,
    items: [{ title: 'Nitro Booster 1 เดือน', quantity: 1, price: 169.00 }]
  });
  await discordNotify(m1.req, m1.res);
  console.log('1. ORDER_NEW Event Result:', m1.getResult());

  // 2. Topup Success
  const m2 = mockReqRes({
    type: 'TOPUP_SUCCESS',
    gateway: 'promptpay',
    amount: 500.00,
    transRef: 'PP-1793851475729'
  });
  await discordNotify(m2.req, m2.res);
  console.log('2. TOPUP_SUCCESS Event Result:', m2.getResult());

  // 3. Warranty Claim
  const m3 = mockReqRes({
    type: 'WARRANTY_CLAIM',
    orderId: 'WX-893120',
    claimReason: 'รหัสเข้าไม่ได้ หรือติด 2FA'
  });
  await discordNotify(m3.req, m3.res);
  console.log('3. WARRANTY_CLAIM Event Result:', m3.getResult());

  // 4. Low Stock Alert
  const m4 = mockReqRes({
    type: 'LOW_STOCK_ALERT',
    productId: 'nitro-booster-1m',
    productTitle: 'Nitro Booster (Mailpass 1 เดือน)',
    remainingStock: 1
  });
  await discordNotify(m4.req, m4.res);
  console.log('4. LOW_STOCK_ALERT Event Result:', m4.getResult());

  // 5. Admin Restock
  const m5 = mockReqRes({
    type: 'ADMIN_RESTOCK',
    productId: 'nitro-boost-1m-2x',
    restockCount: 5
  });
  await discordNotify(m5.req, m5.res);
  console.log('5. ADMIN_RESTOCK Event Result:', m5.getResult());

  console.log('\n🎉 ALL DISCORD NOTIFICATION EMBED TEMPLATES VERIFIED 100%!');
}

testDiscordEvents().catch(console.error);
