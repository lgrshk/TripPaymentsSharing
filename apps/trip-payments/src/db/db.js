import Dexie from 'dexie';

export const db = new Dexie('TripPaymentsDB');

db.version(1).stores({
    trips: '++id, name, startDate',
    persons: '++id, tripId, name',
    expenses: '++id, tripId, date, payerId, currency',
    /* 
       expenses schema details:
       - tripId: index for filtering by trip
       - payerId: index for filtering by payer
       - date: index for sorting
    */
    rates: '[date+currency], rateToUSD'
    /* 
       rates schema:
       - compound index [date+currency] for unique lookups
    */
});

// Helper to populate initial data if needed
db.on('populate', () => {
    // We can add default data here if needed
});
