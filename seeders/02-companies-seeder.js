// seeders/02-produce-stores-seeder.js
// Seeder για καταστήματα φρούτων και λαχανικών

'use strict';

import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';

// Set Greek locale
faker.locale = 'el';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Create admin user
      const adminPassword = await bcrypt.hash('Admin123!@#', 10);
      const [adminUser] = await queryInterface.bulkInsert('users', [{
        id: faker.datatype.uuid(),
        email: 'admin@fruitstore.gr',
        password: adminPassword,
        first_name: 'Διαχειριστής',
        last_name: 'Συστήματος',
        phone: '2310555000',
        role: 'admin',
        is_active: true,
        is_verified: true,
        preferences: JSON.stringify({
          notifications: { email: true, sms: false },
          language: 'el'
        }),
        created_at: new Date(),
        updated_at: new Date()
      }], { 
        transaction,
        returning: true 
      });

      // Ονόματα καταστημάτων φρούτων-λαχανικών
      const storeNames = [
        'Φρέσκα Φρούτα Θεσσαλονίκης',
        'Ο Κήπος του Γιώργου',
        'Φρουτεμπορική Παπαδόπουλος',
        'Λαχανικά & Φρούτα Νικολαΐδης',
        'Αγροτικά Προϊόντα Καραγιάννης',
        'Fresh Market Θεσσαλονίκη',
        'Οπωροπωλείο Το Στέκι',
        'Φρούτα-Λαχανικά Δημητριάδης',
        'Green Valley Οπωροκηπευτικά',
        'Λαϊκή Αγορά Express'
      ];

      // Περιοχές Θεσσαλονίκης για καταστήματα
      const locations = [
        { area: 'Κέντρο', street: 'Τσιμισκή', postalCode: '54624' },
        { area: 'Καλαμαριά', street: 'Μεταμορφώσεως', postalCode: '55133' },
        { area: 'Τούμπα', street: 'Παπαναστασίου', postalCode: '54453' },
        { area: 'Εύοσμος', street: 'Μ. Αλεξάνδρου', postalCode: '56224' },
        { area: 'Αμπελόκηποι', street: 'Ελ. Βενιζέλου', postalCode: '56123' },
        { area: 'Πυλαία', street: 'Κων. Καραμανλή', postalCode: '55535' },
        { area: 'Νεάπολη', street: 'Λαγκαδά', postalCode: '56728' },
        { area: 'Σταυρούπολη', street: 'Λαγκαδά', postalCode: '56430' },
        { area: 'Μοντέρνα Αγορά', street: 'Εγνατία', postalCode: '54630' },
        { area: 'Βαρδάρης', street: 'Μοναστηρίου', postalCode: '54627' }
      ];

      const companies = [];
      const storeOwners = [];

      // Δημιουργία 10 καταστημάτων φρούτων-λαχανικών
      for (let i = 0; i < 10; i++) {
        const companyId = faker.datatype.uuid();
        const ownerId = faker.datatype.uuid();
        const location = locations[i];
        const storeName = storeNames[i];
        
        // Generate 9-digit AFM
        const afm = faker.datatype.number({ min: 100000000, max: 999999999 }).toString();
        
        // Create store owner
        const ownerPassword = await bcrypt.hash('Password123!', 10);
        const ownerFirstName = faker.helpers.arrayElement(['Γιώργος', 'Δημήτρης', 'Νίκος', 'Κώστας', 'Παναγιώτης']);
        const ownerLastName = faker.helpers.arrayElement(['Παπαδόπουλος', 'Νικολαΐδης', 'Καραγιάννης', 'Δημητριάδης', 'Παναγιωτίδης']);
        
        storeOwners.push({
          id: ownerId,
          email: `owner${i + 1}@fruitstore.gr`,
          password: ownerPassword,
          first_name: ownerFirstName,
          last_name: ownerLastName,
          phone: `231055${faker.datatype.number({ min: 1000, max: 9999 })}`,
          role: 'company_owner',
          company_id: companyId,
          is_active: true,
          is_verified: true,
          preferences: JSON.stringify({
            notifications: { email: true, sms: false },
            language: 'el'
          }),
          created_at: new Date(),
          updated_at: new Date()
        });

        // Υπολογισμός ημερομηνιών συνδρομής
        const subscriptionStartDate = faker.date.past(1);
        const subscriptionEndDate = new Date(subscriptionStartDate);
        subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 12);

        // Δημιουργία καταστήματος
        companies.push({
          id: companyId,
          name: storeName,
          legal_name: `${storeName} ${ownerLastName} ${faker.helpers.arrayElement(['ΕΠΕ', 'ΙΚΕ', 'ΟΕ'])}`,
          afm: afm,
          doy: faker.helpers.arrayElement(['Α\' ΘΕΣΣΑΛΟΝΙΚΗΣ', 'Β\' ΘΕΣΣΑΛΟΝΙΚΗΣ', 'ΚΑΛΑΜΑΡΙΑΣ']),
          owner_id: ownerId,
          email: `info@store${i + 1}.gr`,
          phone: `231055${faker.datatype.number({ min: 1000, max: 9999 })}`,
          mobile: `69${faker.datatype.number({ min: 10000000, max: 99999999 })}`,
          fax: null,
          website: faker.datatype.boolean() ? `www.${storeName.toLowerCase().replace(/\s+/g, '')}.gr` : null,
          street: location.street,
          street_number: faker.datatype.number({ min: 1, max: 200 }).toString(),
          city: 'Θεσσαλονίκη',
          postal_code: location.postalCode,
          country: 'Ελλάδα',
          business_type: faker.helpers.arrayElement(['ΕΠΕ', 'ΙΚΕ', 'ΟΕ', 'Ατομική']),
          industry: 'Εμπόριο Φρούτων και Λαχανικών',
          description: `Κατάστημα λιανικής και χονδρικής πώλησης φρούτων και λαχανικών στην περιοχή ${location.area}`,
          logo: null,
          settings: JSON.stringify({
            invoicePrefix: `INV${i + 1}`,
            invoiceStartNumber: 1,
            currentInvoiceNumber: faker.datatype.number({ min: 50, max: 500 }),
            defaultPaymentTerms: faker.helpers.arrayElement([0, 7, 15, 30]),
            defaultVatRate: 13, // ΦΠΑ 13% για φρούτα-λαχανικά
            bankAccounts: [
              {
                bankName: faker.helpers.arrayElement(['Εθνική Τράπεζα', 'Alpha Bank', 'Eurobank', 'Πειραιώς']),
                iban: `GR${faker.datatype.number({ min: 1000000000000000000000000, max: 9999999999999999999999999 })}`,
                accountHolder: storeName,
                isDefault: true
              }
            ],
            workingHours: {
              monday: '07:00-20:00',
              tuesday: '07:00-20:00',
              wednesday: '07:00-14:30',
              thursday: '07:00-20:00',
              friday: '07:00-20:00',
              saturday: '07:00-15:00',
              sunday: 'Κλειστά'
            },
            deliveryAreas: ['Κέντρο', 'Καλαμαριά', 'Τούμπα', 'Εύοσμος'],
            minimumOrder: 20, // Ελάχιστη παραγγελία σε ευρώ
            deliveryFee: 3
          }),
          subscription_plan: faker.helpers.arrayElement(['basic', 'professional']),
          subscription_status: 'active',
          subscription_start_date: subscriptionStartDate,
          subscription_end_date: subscriptionEndDate,
          features: JSON.stringify({
            maxMembers: faker.helpers.arrayElement([100, 500]),
            maxInvoices: faker.helpers.arrayElement([1000, 5000]),
            hasReports: true,
            hasAPI: false,
            hasDelivery: true,
            hasInventory: true,
            hasPOS: faker.datatype.boolean()
          }),
          statistics: JSON.stringify({
            totalMembers: faker.datatype.number({ min: 50, max: 300 }),
            totalInvoices: faker.datatype.number({ min: 100, max: 2000 }),
            totalRevenue: faker.datatype.number({ min: 10000, max: 500000 }),
            lastInvoiceDate: faker.date.recent(),
            averageOrderValue: faker.datatype.number({ min: 15, max: 150 }),
            topProducts: ['Ντομάτες', 'Πατάτες', 'Μήλα', 'Μπανάνες', 'Αγγούρια']
          }),
          is_active: true,
          is_verified: true,
          notes: `Κατάστημα στην περιοχή ${location.area}`,
          created_at: faker.date.past(2),
          updated_at: new Date()
        });
      }

      // Insert store owners
      await queryInterface.bulkInsert('users', storeOwners, { transaction });
      
      // Insert stores
      await queryInterface.bulkInsert('companies', companies, { transaction });

      // Create employees for each store (υπάλληλοι καταστημάτων)
      const employees = [];
      for (let i = 0; i < companies.length; i++) {
        const numEmployees = faker.datatype.number({ min: 1, max: 2 });
        
        for (let j = 0; j < numEmployees; j++) {
          const employeePassword = await bcrypt.hash('Employee123!', 10);
          const roles = ['Πωλητής', 'Ταμίας', 'Αποθηκάριος', 'Οδηγός'];
          
          employees.push({
            id: faker.datatype.uuid(),
            email: `employee${i}_${j}@store${i + 1}.gr`,
            password: employeePassword,
            first_name: faker.helpers.arrayElement(['Μαρία', 'Ελένη', 'Γιάννης', 'Κώστας', 'Σοφία']),
            last_name: faker.helpers.arrayElement(['Παπαδοπούλου', 'Νικολάου', 'Γεωργίου', 'Δημητρίου']),
            phone: `231055${faker.datatype.number({ min: 1000, max: 9999 })}`,
            role: 'member',
            company_id: companies[i].id,
            is_active: true,
            is_verified: true,
            preferences: JSON.stringify({
              notifications: { email: true, sms: false },
              language: 'el',
              position: faker.helpers.arrayElement(roles)
            }),
            last_login: faker.date.recent(),
            created_at: faker.date.past(1),
            updated_at: new Date()
          });
        }
      }

      // Insert employees
      if (employees.length > 0) {
        await queryInterface.bulkInsert('users', employees, { transaction });
      }

      await transaction.commit();
      
      console.log('✅ Produce stores seeder completed successfully');
      console.log(`   - Created ${companies.length} καταστήματα φρούτων-λαχανικών`);
      console.log(`   - Created ${storeOwners.length} ιδιοκτήτες καταστημάτων`);
      console.log(`   - Created ${employees.length} υπαλλήλους`);
      console.log('');
      console.log('📧 Test Accounts:');
      console.log('   Admin: admin@fruitstore.gr / Admin123!@#');
      console.log('   Ιδιοκτήτης: owner1@fruitstore.gr / Password123!');
      console.log('   Υπάλληλος: employee0_0@store1.gr / Employee123!');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Produce stores seeder failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      await queryInterface.bulkDelete('users', {
        role: { [Sequelize.Op.in]: ['member', 'company_owner'] }
      }, { transaction });
      
      await queryInterface.bulkDelete('companies', null, { transaction });
      
      await queryInterface.bulkDelete('users', {
        email: 'admin@fruitstore.gr'
      }, { transaction });
      
      await transaction.commit();
      
      console.log('✅ Produce stores seeder rolled back successfully');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Produce stores seeder rollback failed:', error);
      throw error;
    }
  }
};