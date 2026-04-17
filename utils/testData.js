// utils/testData.js
// Update these values to match actual supplier/product names in the LS1 app
// for the gestid subdistributor account.

const TEST_DATA = {
  po: {
    Distributor: 'XO Distributing',  
    product:  'Jennies Eggs',                  
    quantity: 10,
  },
  salesOrder: {
    loadingStore: 'XO stores',
    paymentTerm: 'Cash',
    leadDays: 7,
  },
};

module.exports = { TEST_DATA };
