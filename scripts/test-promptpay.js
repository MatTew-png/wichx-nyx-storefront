// PromptPay EMVCo QR Payload Generator
function crc16(data) {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function generatePromptPayPayload(target, amount) {
  // Format target: phone number or National ID
  const cleaned = target.replace(/[^0-9]/g, '');
  let tag29Sub01 = '';
  
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    // Mobile number: prefix with 0066 and drop leading 0
    tag29Sub01 = '01' + ('0066' + cleaned.substring(1)).length.toString().padStart(2, '0') + ('0066' + cleaned.substring(1));
  } else if (cleaned.length === 13) {
    // National ID
    tag29Sub01 = '02' + cleaned.length.toString().padStart(2, '0') + cleaned;
  } else {
    tag29Sub01 = '01130066' + cleaned;
  }

  const tag29Sub00 = '0016A000000677010111';
  const tag29Content = tag29Sub00 + tag29Sub01;
  const tag29 = '29' + tag29Content.length.toString().padStart(2, '0') + tag29Content;

  const tag00 = '000201';
  const tag01 = amount ? '010212' : '010211'; // 12 for dynamic (with amount), 11 for static
  const tag53 = '5303764'; // THB
  const tag58 = '5802TH';

  let payloadWithoutCrc = tag00 + tag01 + tag29 + tag53;
  if (amount && parseFloat(amount) > 0) {
    const formattedAmount = parseFloat(amount).toFixed(2);
    const tag54 = '54' + formattedAmount.length.toString().padStart(2, '0') + formattedAmount;
    payloadWithoutCrc += tag54;
  }
  payloadWithoutCrc += tag58 + '6304';

  const checksum = crc16(payloadWithoutCrc);
  return payloadWithoutCrc + checksum;
}

const testPayload = generatePromptPayPayload('0951234567', 150);
console.log('Generated PromptPay QR Payload:', testPayload);
