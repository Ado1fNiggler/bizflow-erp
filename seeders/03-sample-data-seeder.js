// seeders/03-produce-sample-data-seeder.js
// Seeder για δοκιμαστικά δεδομένα καταστημάτων φρούτων-λαχανικών

'use strict';

import { faker } from '@faker-js/faker';

// Set Greek locale
faker.locale = 'el';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Get existing stores
      const companies = await queryInterface.sequelize.query(
        'SELECT id, name, settings FROM companies WHERE is_active = true',
        { 
          type: Sequelize.QueryTypes.SELECT,
          transaction 
        }
      );

      if (companies.length === 0) {
        console.log('⚠️  No companies found. Run 02-produce-stores-seeder first.');
        return;
      }

      // Προϊόντα φρούτων
      const fruits = [
        { name: 'Μήλα Στάρκιν', unit: 'kg', category: 'Φρούτα', origin: 'Ελλάδα', avgPrice: 1.80 },
        { name: 'Μήλα Φούτζι', unit: 'kg', category: 'Φρούτα', origin: 'Ελλάδα', avgPrice: 2.20 },
        { name: 'Πορτοκάλια Μέρλιν', unit: 'kg', category: 'Φρούτα', origin: 'Ελλάδα', avgPrice: 0.90 },
        { name: 'Πορτοκάλια Βαλέντσια', unit: 'kg', category: 'Φρούτα', origin: 'Ελλάδα', avgPrice: 1.10 },
        { name: 'Μανταρίνια Κλημεντίνες', unit: 'kg', category: 'Φρούτα', origin: 'Ελλάδα', avgPrice: 1.50 },
        { name: 'Λεμόνια', unit: 'kg', category: 'Φρούτα', origin: 'Ελλάδα', avgPrice: 1.30 },
        { name: 'Μπανάνες', unit: 'kg', category: 'Φρούτα', origin: 'Εκουαδόρ', avgPrice: 1.90 },
        { name: 'Φράουλες', unit: 'kg', category: 'Φρούτα', origin: 'Ελλάδα', avgPrice: 3.50 },
        { name: 'Σταφύλια Σουλτανίνα', unit: 'kg', category: 'Φρούτα', origin: 'Ελλάδα', avgPrice: 2.80 },
        { name: 'Αχλάδια Κρυστάλλια', unit: 'kg', category: 'Φρούτα', origin: 'Ελλάδα', avgPrice: 2.00 },
        { name: 'Ροδάκινα', unit: 'kg', category: 'Φρούτα', origin: 'Ελλάδα', avgPrice: 2.50 },
        { name: 'Νεκταρίνια', unit: 'kg', category: 'Φρούτα', origin: 'Ελλάδα', avgPrice: 2.70 },
        { name: 'Βερίκοκα', unit: 'kg', category: 'Φρούτα', origin: 'Ελλάδα', avgPrice: 2.20 },
        { name: 'Καρπούζι', unit: 'kg', category: 'Φρούτα', origin: 'Ελλάδα', avgPrice: 0.50 },
        { name: 'Πεπόνι', unit: 'kg', category: 'Φρούτα', origin: 'Ελλάδα', avgPrice: 1.20 },
        { name: 'Ακτινίδια', unit: 'kg', category: 'Φρούτα', origin: 'Ελλάδα', avgPrice: 2.40 },
        { name: 'Ανανάς', unit: 'τεμ', category: 'Φρούτα', origin: 'Κόστα Ρίκα', avgPrice: 3.50 },
        { name: 'Αβοκάντο', unit: 'τεμ', category: 'Φρούτα', origin: 'Περού', avgPrice: 1.80 }
      ];

      // Προϊόντα λαχανικών
      const vegetables = [
        { name: 'Ντομάτες Α\' Ποιότητας', unit: 'kg', category: 'Λαχανικά', origin: 'Ελλάδα', avgPrice: 1.60 },
        { name: 'Ντομάτες Βιολογικές', unit: 'kg', category: 'Λαχανικά', origin: 'Ελλάδα', avgPrice: 2.80 },
        { name: 'Αγγούρια', unit: 'kg', category: 'Λαχανικά', origin: 'Ελλάδα', avgPrice: 1.30 },
        { name: 'Πιπεριές Φλωρίνης', unit: 'kg', category: 'Λαχανικά', origin: 'Ελλάδα', avgPrice: 2.90 },
        { name: 'Πιπεριές Πράσινες', unit: 'kg', category: 'Λαχανικά', origin: 'Ελλάδα', avgPrice: 1.80 },
        { name: 'Μελιτζάνες Φλάσκες', unit: 'kg', category: 'Λαχανικά', origin: 'Ελλάδα', avgPrice: 1.70 },
        { name: 'Κολοκυθάκια', unit: 'kg', category: 'Λαχανικά', origin: 'Ελλάδα', avgPrice: 1.50 },
        { name: 'Πατάτες Νέες', unit: 'kg', category: 'Λαχανικά', origin: 'Ελλάδα', avgPrice: 0.90 },
        { name: 'Πατάτες Κύπρου', unit: 'kg', category: 'Λαχανικά', origin: 'Κύπρος', avgPrice: 1.20 },
        { name: 'Κρεμμύδια Ξερά', unit: 'kg', category: 'Λαχανικά', origin: 'Ελλάδα', avgPrice: 0.80 },
        { name: 'Κρεμμύδια Φρέσκα', unit: 'ματσάκι', category: 'Λαχανικά', origin: 'Ελλάδα', avgPrice: 0.70 },
        { name: 'Σκόρδα', unit: 'kg', category: 'Λαχανικά', origin: 'Ελλάδα', avgPrice: 4.50 },
        { name: 'Καρότα', unit: 'kg', category: 'Λαχανικά', origin: 'Ελλάδα', avgPrice: 1.10 },
        { name: 'Μαρούλι', unit: 'τεμ', category: 'Λαχανικά', origin: 'Ελλάδα', avgPrice: 0.80 },
        { name: 'Λάχανο', unit: 'kg', category: 'Λαχανικά', origin: 'Ελλάδα', avgPrice: 0.70 },
        { name: 'Κουνουπίδι', unit: 'kg', category: 'Λαχανικά', origin: 'Ελλάδα', avgPrice: 1.90 },
        { name: 'Μπρόκολο', unit: 'kg', category: 'Λαχανικά', origin: 'Ελλάδα', avgPrice: 2.20 },
        { name: 'Σπανάκι', unit: 'kg', category: 'Λαχανικά', origin: 'Ελλάδα', avgPrice: 2.50 },
        { name: 'Σέλινο', unit: 'kg', category: 'Λαχανικά', origin: 'Ελλάδα', avgPrice: 1.60 },
        { name: 'Μαϊντανός', unit: 'ματσάκι', category: 'Λαχανικά', origin: 'Ελλάδα', avgPrice: 0.50 },
        { name: 'Άνηθος', unit: 'ματσάκι', category: 'Λαχανικά', origin: 'Ελλάδα', avgPrice: 0.50 },
        { name: 'Παντζάρια', unit: 'kg', category: 'Λαχανικά', origin: 'Ελλάδα', avgPrice: 1.40 },
        { name: 'Ραδίκια', unit: 'kg', category: 'Λαχανικά', origin: 'Ελλάδα', avgPrice: 1.80 }
      ];

      const allProducts = [...fruits, ...vegetables];

      // Τύποι πελατών για καταστήματα φρούτων-λαχανικών
      const customerTypes = [
        { type: 'retail', prefix: 'Πελάτης Λιανικής', percentage: 60 },
        { type: 'restaurant', prefix: 'Εστιατόριο', percentage: 20 },
        { type: 'hotel', prefix: 'Ξενοδοχείο', percentage: 10 },
        { type: 'minimarket', prefix: 'Mini Market', percentage: 10 }
      ];

      // Ονόματα εστιατορίων/ξενοδοχείων
      const businessCustomers = [
        'Ταβέρνα Ο Νίκος', 'Εστιατόριο Η Θάλασσα', 'Ψητοπωλείο Ο Μάκης',
        'Hotel Olympia', 'Hotel Macedonia', 'Ξενοδοχείο Αριστοτέλης',
        'Mini Market 24/7', 'Super Market Express', 'Παντοπωλείο Το Στέκι'
      ];

      const members = [];
      const documents = [];
      const documentItems = [];

      // Create members and documents for each store
      for (const company of companies) {
        const numMembers = faker.datatype.number({ min: 50, max: 150 });
        
        // Create members (πελάτες) for this store
        for (let i = 0; i < numMembers; i++) {
          const memberId = faker.datatype.uuid();
          const customerType = faker.helpers.weightedArrayElement([
            { weight: 60, value: 'retail' },
            { weight: 20, value: 'restaurant' },
            { weight: 10, value: 'hotel' },
            { weight: 10, value: 'minimarket' }
          ]);
          
          const isIndividual = customerType === 'retail';
          const afm = !isIndividual ? faker.datatype.number({ min: 100000000, max: 999999999 }).toString() : null;
          
          const memberData = {
            id: memberId,
            company_id: company.id,
            member_type: isIndividual ? 'individual' : 'business',
            email: isIndividual ? faker.internet.email().toLowerCase() : `info@business${i}.gr`,
            phone: `2310${faker.datatype.number({ min: 100000, max: 999999 })}`,
            mobile: `69${faker.datatype.number({ min: 10000000, max: 99999999 })}`,
            street: faker.helpers.arrayElement(['Τσιμισκή', 'Εγνατία', 'Μοναστηρίου', 'Λαγκαδά', 'Βενιζέλου']),
            street_number: faker.datatype.number({ min: 1, max: 200 }).toString(),
            city: 'Θεσσαλονίκη',
            postal_code: faker.helpers.arrayElement(['54624', '54636', '55133', '56224']),
            country: 'Ελλάδα',
            afm: afm,
            doy: afm ? faker.helpers.arrayElement(['Α\' ΘΕΣΣΑΛΟΝΙΚΗΣ', 'Β\' ΘΕΣΣΑΛΟΝΙΚΗΣ']) : null,
            category: 'customer',
            tags: JSON.stringify(
              isIndividual ? 
                ['Λιανική', faker.datatype.boolean() ? 'Τακτικός' : 'Περιστασιακός'] :
                [customerType === 'restaurant' ? 'Εστίαση' : customerType === 'hotel' ? 'Ξενοδοχείο' : 'Mini Market', 'Χονδρική', 'B2B']
            ),
            is_active: true,
            is_favorite: faker.datatype.boolean(0.1),
            notes: null,
            created_at: faker.date.past(2),
            updated_at: faker.date.recent()
          };

          // Individual customer data
          if (isIndividual) {
            memberData.individual_data = JSON.stringify({
              firstName: faker.helpers.arrayElement(['Γιώργος', 'Μαρία', 'Νίκος', 'Ελένη', 'Κώστας', 'Σοφία']),
              lastName: faker.helpers.arrayElement(['Παπαδόπουλος', 'Νικολάου', 'Γεωργίου', 'Δημητρίου']),
              profession: 'Ιδιώτης'
            });
            memberData.business_data = JSON.stringify({});
          } else {
            // Business customer data
            const businessName = faker.helpers.arrayElement(businessCustomers);
            
            memberData.business_data = JSON.stringify({
              name: businessName,
              legalName: `${businessName} ${faker.helpers.arrayElement(['ΕΠΕ', 'ΑΕ', 'ΙΚΕ'])}`,
              afm: afm,
              businessType: faker.helpers.arrayElement(['ΕΠΕ', 'ΑΕ', 'ΙΚΕ']),
              industry: customerType === 'restaurant' ? 'Εστίαση' : 
                        customerType === 'hotel' ? 'Ξενοδοχεία' : 'Λιανικό Εμπόριο',
              contactPerson: {
                name: `${faker.helpers.arrayElement(['Γιώργος', 'Μαρία', 'Νίκος'])} ${faker.helpers.arrayElement(['Παπαδόπουλος', 'Νικολάου'])}`,
                position: 'Υπεύθυνος Προμηθειών',
                phone: `2310${faker.datatype.number({ min: 100000, max: 999999 })}`
              }
            });
            memberData.individual_data = JSON.stringify({});
          }

          // Financial data
          const creditLimit = isIndividual ? 0 : faker.helpers.arrayElement([500, 1000, 2000, 5000]);
          const paymentTerms = isIndividual ? 0 : faker.helpers.arrayElement([7, 15, 30]);
          
          memberData.financial = JSON.stringify({
            creditLimit: creditLimit,
            currentBalance: 0,
            paymentTerms: paymentTerms,
            discount: customerType === 'restaurant' || customerType === 'hotel' ? 10 : 0,
            vatExempt: false,
            bankAccount: {}
          });

          memberData.statistics = JSON.stringify({
            totalInvoices: 0,
            totalAmount: 0,
            totalPaid: 0,
            totalPending: 0,
            lastInvoiceDate: null,
            lastPaymentDate: null
          });

          memberData.communication_log = JSON.stringify([]);
          members.push(memberData);

          // Create invoices for this customer
          const numInvoices = isIndividual ? 
            faker.datatype.number({ min: 0, max: 5 }) : 
            faker.datatype.number({ min: 5, max: 30 });
          
          const companySettings = JSON.parse(company.settings);
          
          for (let d = 0; d < numInvoices; d++) {
            const documentId = faker.datatype.uuid();
            const documentDate = faker.date.between(memberData.created_at, new Date());
            const dueDate = new Date(documentDate);
            dueDate.setDate(dueDate.getDate() + paymentTerms);
            
            // Generate invoice number
            const invoiceNumber = `${companySettings.invoicePrefix}-${String(companySettings.currentInvoiceNumber + d).padStart(6, '0')}`;
            
            const documentData = {
              id: documentId,
              company_id: company.id,
              member_id: memberId,
              document_type: 'invoice',
              document_number: invoiceNumber,
              document_date: documentDate,
              due_date: dueDate,
              payment_terms: paymentTerms,
              status: faker.helpers.weightedArrayElement([
                { weight: 60, value: 'paid' },
                { weight: 30, value: 'pending' },
                { weight: 10, value: 'overdue' }
              ]),
              description: isIndividual ? 'Λιανική Πώληση' : 'Χονδρική Πώληση',
              notes: null,
              subtotal: 0,
              total_discount: 0,
              total_net: 0,
              total_vat: 0,
              total_amount: 0,
              created_at: documentDate,
              updated_at: faker.date.between(documentDate, new Date())
            };

            // Create invoice items (products)
            const numItems = isIndividual ? 
              faker.datatype.number({ min: 1, max: 5 }) : 
              faker.datatype.number({ min: 3, max: 15 });
            
            let subtotal = 0;
            let totalVat = 0;
            let totalDiscount = 0;
            
            // Select random products for this invoice
            const selectedProducts = faker.helpers.arrayElements(allProducts, numItems);
            
            for (const product of selectedProducts) {
              const quantity = isIndividual ? 
                faker.datatype.float({ min: 0.5, max: 5, precision: 0.5 }) :
                faker.datatype.float({ min: 5, max: 50, precision: 0.5 });
              
              // Add some price variation (±20%)
              const priceVariation = faker.datatype.float({ min: 0.8, max: 1.2, precision: 0.01 });
              const unitPrice = product.avgPrice * priceVariation;
              
              const vatRate = 13; // ΦΠΑ 13% για φρούτα-λαχανικά
              const discount = JSON.parse(memberData.financial).discount || 0;
              
              const netAmount = quantity * unitPrice;
              const discountAmount = netAmount * (discount / 100);
              const taxableAmount = netAmount - discountAmount;
              const vatAmount = taxableAmount * (vatRate / 100);
              const totalAmount = taxableAmount + vatAmount;
              
              subtotal += netAmount;
              totalDiscount += discountAmount;
              totalVat += vatAmount;
              
              documentItems.push({
                id: faker.datatype.uuid(),
                document_id: documentId,
                description: `${product.name} (${product.origin})`,
                quantity: quantity,
                unit: product.unit,
                unit_price: unitPrice,
                discount: discount,
                vat_rate: vatRate,
                net_amount: netAmount,
                discount_amount: discountAmount,
                vat_amount: vatAmount,
                total_amount: totalAmount,
                notes: null,
                created_at: documentDate,
                updated_at: documentDate
              });
            }
            
            // Update document totals
            documentData.subtotal = subtotal;
            documentData.total_discount = totalDiscount;
            documentData.total_net = subtotal - totalDiscount;
            documentData.total_vat = totalVat;
            documentData.total_amount = documentData.total_net + totalVat;
            
            documents.push(documentData);
          }
        }
      }

      // Insert members
      if (members.length > 0) {
        await queryInterface.bulkInsert('members', members, { transaction });
        console.log(`✅ Created ${members.length} πελάτες`);
      }

      // Check if documents table exists and insert
      const tableExists = await queryInterface.sequelize.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'documents')",
        { 
          type: Sequelize.QueryTypes.SELECT,
          transaction 
        }
      );

      if (tableExists[0].exists && documents.length > 0) {
        await queryInterface.bulkInsert('documents', documents, { transaction });
        console.log(`✅ Created ${documents.length} τιμολόγια`);
        
        if (documentItems.length > 0) {
          await queryInterface.bulkInsert('document_items', documentItems, { transaction });
          console.log(`✅ Created ${documentItems.length} προϊόντα σε τιμολόγια`);
        }
      }

      // Update member statistics
      for (const member of members) {
        const memberDocuments = documents.filter(d => d.member_id === member.id);
        
        if (memberDocuments.length > 0) {
          const stats = {
            totalInvoices: memberDocuments.length,
            totalAmount: memberDocuments.reduce((sum, d) => sum + d.total_amount, 0),
            totalPaid: memberDocuments.filter(d => d.status === 'paid')
              .reduce((sum, d) => sum + d.total_amount, 0),
            totalPending: memberDocuments.filter(d => ['pending', 'overdue'].includes(d.status))
              .reduce((sum, d) => sum + d.total_amount, 0),
            lastInvoiceDate: memberDocuments
              .sort((a, b) => b.document_date - a.document_date)[0].document_date,
            lastPaymentDate: memberDocuments
              .filter(d => d.status === 'paid')
              .sort((a, b) => b.updated_at - a.updated_at)[0]?.updated_at || null
          };
          
          await queryInterface.sequelize.query(
            `UPDATE members SET statistics = :stats WHERE id = :id`,
            {
              replacements: {
                stats: JSON.stringify(stats),
                id: member.id
              },
              transaction
            }
          );
        }
      }

      await transaction.commit();
      
      console.log('');
      console.log('✅ Produce sample data seeder completed successfully');
      console.log('📊 Summary:');
      console.log(`   - ${members.length} πελάτες (λιανική & χονδρική)`);
      console.log(`   - ${documents.length} τιμολόγια`);
      console.log(`   - ${documentItems.length} γραμμές προϊόντων`);
      console.log('');
      console.log('📦 Προϊόντα:');
      console.log(`   - ${fruits.length} είδη φρούτων`);
      console.log(`   - ${vegetables.length} είδη λαχανικών`);
      console.log('');
      console.log('💡 Χρήσιμες πληροφορίες:');
      console.log('   - ΦΠΑ 13% για όλα τα προϊόντα');
      console.log('   - Εκπτώσεις 10% για εστιατόρια/ξενοδοχεία');
      console.log('   - Πίστωση 7-30 ημέρες για επιχειρήσεις');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Produce sample data seeder failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      const tableExists = await queryInterface.sequelize.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'documents')",
        { 
          type: Sequelize.QueryTypes.SELECT,
          transaction 
        }
      );

      if (tableExists[0].exists) {
        await queryInterface.bulkDelete('document_items', null, { transaction });
        await queryInterface.bulkDelete('documents', null, { transaction });
      }
      
      await queryInterface.bulkDelete('members', null, { transaction });
      
      await transaction.commit();
      
      console.log('✅ Produce sample data seeder rolled back successfully');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Produce sample data seeder rollback failed:', error);
      throw error;
    }
  }
};