require('dotenv').config();

console.log('🔍 Environment Variables Debug:');
console.log('GOOGLE_PRIVATE_KEY_ID exists:', !!process.env.GOOGLE_PRIVATE_KEY_ID);
console.log('GOOGLE_PRIVATE_KEY exists:', !!process.env.GOOGLE_PRIVATE_KEY);  
console.log('GOOGLE_CLIENT_ID exists:', !!process.env.GOOGLE_CLIENT_ID);

console.log('\nValues:');
console.log('GOOGLE_PRIVATE_KEY_ID:', process.env.GOOGLE_PRIVATE_KEY_ID?.substring(0, 20) + '...');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
console.log('GOOGLE_PRIVATE_KEY starts with:', process.env.GOOGLE_PRIVATE_KEY?.substring(0, 30) + '...');

console.log('\nChecking for placeholder text:');
console.log('Has placeholder in KEY_ID:', process.env.GOOGLE_PRIVATE_KEY_ID?.includes('your_private_key_id_here'));
console.log('Has placeholder in PRIVATE_KEY:', process.env.GOOGLE_PRIVATE_KEY?.includes('your_private_key_here'));
console.log('Has placeholder in CLIENT_ID:', process.env.GOOGLE_CLIENT_ID?.includes('your_client_id_here'));