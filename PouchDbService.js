var PouchDB = require('pouchdb-node');
var pouchDbService = "http://192.168.1.28:3000/";
var pricelistxcustomerprefix = "dbc73c0a-ef4a-4168-909a-44d4ccc9f7a2";
var skuprefix = "f3cac706-6818-4d0e-ad4a-82053e909914";
var taskprefix = "c0b2375b-db8c-414e-be7a-79389933cd9c";
var pricelistxskuprefix = "cc2c6f70-fba8-4219-a790-c14c7631a8e9";
var defaultpricelistprefix = "27886be6-36e1-4e74-b59e-0f182cb4fa5b";
var ruleprefix = "dc7545b8-4b62-4544-9a2e-8ae6ebca2677";
var consignmentprefix = "7575cf88-a948-4363-9b76-66a3196d9b6e";
var docsequenceprefix = "777f0fcd-021e-4f7e-a3c0-8eef90942574";
var skuseriesprefix = "31e14e4b-9864-4225-86e1-4ab673cb3e35";
var errorprfix = "12760fec-ea49-4949-9aa1-92dbd8a7e138";
var profileprefix = "f9977915-d442-4a70-8206-da382d8abdd2";
var pricelistdefaulprefix = "253cc9fe-9d3e-4c5d-b337-135bde77a040";
var bankaccountprefix = "e3219115-2801-4cb8-8b28-fcac63385810";
var voidreasonprefix = "9968552f-afba-47be-ae62-266f58645819";
var alerlimitprefix = "b3e9fbd1-e55d-4ab7-9184-5733fa1bf174";
var notificationprefix = "98c95d14-80e4-46ac-ab2c-0700f74a51b1";
var authprefix = "16513fc5-d53a-4262-aae5-944d7dfe9d13";
var businessRivalCommentprefix = "4ccf289d-174d-4f4f-b9fc-974acfeb606d";
var classificationprefix = "42ea534c-9955-4422-a1d8-ca01e38786b3";
var reasonVoidConsignmentprefix = "1f15145a-54b8-4fc2-8469-9dd1b6dbad72";
var reasonprefix = "6dce04b9-4512-41f1-9b3c-070dbf0bfe36";
var parameterprefix = "8ac39224-2bc4-4317-9b9d-f51cd9eb4b52";
var discountXGeneralAmountListprefix = "37419f19-6c9f-4549-a7bd-3a3978b1d50d";
var skuComboBonusListprefix = "2c32ee8d-6d68-4140-9dc5-eaf80aaf705b";
var comboBonusListprefix = "03815265-7156-460b-bc86-9a3331915600";
var sku4Comboprefix = "43d1218d-80f8-429d-9897-3b5e4a8e1c3c";
var comboprefix = "4401037e-ea15-44df-a93a-dbc49800622b";
var salesSkuXMultipleListprefix = "94dea8ed-fe1f-4f1e-9547-7885cfaae56e";
var defaultBonusAndDiscountListIdprefix = "43dad278-3da0-48e8-ab3c-018898d8b105";
var currencyprefix = "8179ed05-08ee-4483-8e24-0883868e8d87";
var bonusSkuMultiplesprfix = "bd1601ef-9867-4b6c-bea5-fe67f2ccc7d1";
var discountListXSkuprfix = "eaebaabe-d8b6-4b86-8c60-280bb42e6dba";
var bonusListXSkuprefix = "cba7ce79-0a79-4a16-b82b-8f1cd5543892";
var priceXSkuScaleprefix = "6eb18eef-3543-4fca-bd50-375482ceb096";
var defaultPackSkuprefix = "6e478b54-4453-4287-bc27-40f251af0a8d";
var invoiceDraftprefix = "31102dab-ce44-4dfa-bf6c-2c966ebe3196";
var saleOrderDrafprefix = "620bdc74-6d13-4b4f-97dd-b5ca52497e7b";
var itemHistoryprefix = "e9088ef2-efd4-4812-a63f-4ed66952fb6f";
var invoiceprefix = "82f0fe9c-74fe-4f30-8443-2069548859be";
var familySkyprefix = "67979730-07f9-4057-8e7c-e2e92eebc3bd";
var packConversionprfix = "eed4fdd2-fa4b-4e9a-9188-8c3376affcd6";
var packUnitprefix = "6e89e273-6f2c-4e9b-845a-50675fb4eef3";
var tagXCustomerprefix = "3e283f95-70c5-4fb4-ad07-e915760a4d4e";
var cutomerFrequencyprefix = "fb00dc7d-41cc-444f-a88d-8c3991d7a839";
var customerprefix = "9514a32b-278d-49c7-95ef-ed7535f52baa";
var tagprefix = "ca82c35b-123e-44a0-bc0e-446c214df3a0";
var skuPresaleprefix = "3b0a8d93-2aeb-419a-8e99-c2785f330ac3";
var documentPrefix = "43229de6-2172-4d69-aa15-cb0d8246afcd";
//var buff =new Array();
var routes = {};


function getPouchDb(data) {
    try {
        return new PouchDB(pouchDbService + getDbId(data));
    } catch (ex) {
        console.log(ex.message);
    }
}
function getDbId(data) {
    if (data.loginid === undefined || data.loggeduser === undefined) {
        return null;
    }
    if(data.loggeduser === undefined){
        return data.loginid.replace("@", "At") + data.device_id.replace("-", "_");
    }
    return data.loggeduser.replace("@", "At");
}

function Buff(data) {
    var buff = routes[getDbId(data)];
    if (buff != null) {
        return buff;
    } else {
        return new Array();
    }
}

module.exports = {
    clearWorkspace:function(data){
          routes[getDbId(data)] = null;  
    }
    ,
    updateProfile: function (data) {
        if (routes[getDbId(data)] != null) {
            return Promise.reject({ Message: "The workspace is not empty, please try again", socket: null });
        }
        routes[getDbId(data)] = new Array();
        var db = getPouchDb(data);


        var doc = {
            profile: data,
            docType: profileprefix,
            password: data.password
        };
        Buff(data).push(doc);
        return db.destroy().then(() => {
            return Promise.resolve(doc);
        }).catch(reason => {
            routes[getDbId(data)] = null;            
            return Promise.reject({ Message: reason.message, socket: null }); 
        });

    },
    addParameter: function (data, parameter) {
        //var db = getPouchDb(data);
        var obj = parameter;
        var doc = {
            parameter: obj,
            docType: parameterprefix

        };

        Buff(data).push(doc);//db.post(doc);


    },
    addAuth: function (data, auth) {
        var obj = auth;
        var doc = {
            auth: obj,
            docType: authprefix

        };
        Buff(data).push(doc);//db.post(doc);
    },
    addBankAccount: function (data, bankAccount) {

        var obj = bankAccount;
        var doc = {
            bankAccount: obj,
            docType: bankaccountprefix

        };
        Buff(data).push(doc);//db.post(doc);

    },
    addError: function (data, error) {
        //var db = getPouchDb(data);
        var doc = {
            error: error,
            docType: errorprfix
        };
        Buff(data).push(doc);//db.post(doc);

    },
    addNotification: function (data, notification, reference) {
        //var db = getPouchDb(data);
        var doc = {
            notification: notification,
            reference: reference,
            docType: notificationprefix
        };
        Buff(data).push(doc);//db.post(doc);
    },
    addAlertLimit: function (data, alertLimit) {
        //var db = getPouchDb(data);
        var doc = {
            alertLimit: alertLimit,
            docType: alerlimitprefix
        };

        Buff(data).push(doc);//db.post(doc);
    },
    addVoidrReason: function (data, voidReason) {
        //var db = getPouchDb(data);
        var doc = {
            voidReason: voidReason,
            docType: voidreasonprefix
        };
        Buff(data).push(doc);//db.post(doc);
    },
    addSku: function (data, sku) {
        //var db = getPouchDb(data);
        var doc = {
            sku: sku,
            history: { QTY_CONSIGNED: 0, QTY_SOLD: 0, QTY_COLLECTED: 0 },
            docType: skuprefix
        };
        Buff(data).push(doc);//db.post(doc);

    },
    addPriceListByCustomer: function (data, priceList) {
        //var db = getPouchDb(data);

        var doc = {
            priceListByCustomer: priceList,
            docType: pricelistxcustomerprefix
        };
        Buff(data).push(doc);//db.post(doc);
    },
    addSkuSerie: function (data, skuSerie) {
        //var db = getPouchDb(data);
        var doc = {
            skuSerie: skuSerie,
            docType: skuseriesprefix

        };
        Buff(data).push(doc);//db.post(doc);

    },
    addToTask: function (data, task) {
        //var db = getPouchDb(data);
        var doc = {
            task: task,
            docType: taskprefix
        };
        Buff(data).push(doc);//db.post(doc);
    },
    addPriceListBySKU: function (data, pricelistXSku) {
        //var db = getPouchDb(data);
        var doc = {
            priceListXSku: pricelistXSku,
            docType: pricelistxskuprefix
        };
        Buff(data).push(doc);//db.post(doc);
    },
    addPriceListDefault: function (data, defaultPriceList) {
        //var db = getPouchDb(data);
        var doc = {
            defaultPriceList: defaultPriceList,
            docType: pricelistdefaulprefix
        };
        Buff(data).push(doc);//db.post(doc);
    },
    addRule: function (data, rule) {
        //var db = getPouchDb(data);
        var doc = {
            rule: rule,
            docType: ruleprefix
        };
        Buff(data).push(doc);//db.post(doc);
    },
    addConsignment: function (data, consignment) {
        //var db = getPouchDb(data);
        var doc = {
            consignment: consignment,
            fromBackOffice: true,
            docType: consignmentprefix
        };
        Buff(data).push(doc);//db.post(doc);
    },
    addDocumentSequence: function (data, documentSequence) {
        //var db = getPouchDb(data);
        var doc = {
            docSquence: documentSequence,
            docType: docsequenceprefix

        };
        Buff(data).push(doc);//db.post(doc);
    },
    addClassification: function (data, classification) {
        //var db = getPouchDb(data);
        var doc = {
            classification: classification,
            docType: classificationprefix

        };
        Buff(data).push(doc);//db.post(doc);
    },
    addDiscountXGeneralAmountList: function (data, discountXGeneralAmountList) {
        //var db = getPouchDb(data);
        var obj = discountXGeneralAmountList;
        var doc = {
            discountXGeneralAmountList: obj,
            docType: discountXGeneralAmountListprefix

        };
        Buff(data).push(doc);//db.post(doc);
    },
    addSkuComboBonusList: function (data, skuComboBonusList) {
        //var db = getPouchDb(data);
        var obj = skuComboBonusList;
        var doc = {
            skuComboBonusList: obj,
            docType: skuComboBonusListprefix

        };
        Buff(data).push(doc);//db.post(doc);
    },
    addComboBonusList: function (data, comboBonusList) {
        //var db = getPouchDb(data);
        var obj = comboBonusList;
        var doc = {
            comboBonusList: obj,
            docType: comboBonusListprefix

        };
        Buff(data).push(doc);//db.post(doc);
    },
    addSku4Combo: function (data, sku4Combo) {
        //var db = getPouchDb(data);
        var obj = sku4Combo;
        var prefix = sku4Comboprefix;
        var doc = {
            sku4Combo: obj,
            docType: prefix

        };
        Buff(data).push(doc);//db.post(doc);
    },
    addCombo: function (data, combo) {
        //var db = getPouchDb(data);
        var obj = combo;
        var prefix = comboprefix;
        var doc = {
            combo: obj,
            docType: prefix

        };
        Buff(data).push(doc);//db.post(doc);
    }
    ,
    addSalesSkuXMultipleList: function (data, salesSkuXMultipleList) {
        //var db = getPouchDb(data);
        var obj = salesSkuXMultipleList;
        var prefix = salesSkuXMultipleListprefix;
        var doc = {
            salesSkuXMultipleList: obj,
            docType: prefix

        };
        Buff(data).push(doc);//db.post(doc);
    },
    addDefaultBonusAndDiscountListId: function (data, defaultBonusAndDiscountListId) {
        //var db = getPouchDb(data);
        var obj = defaultBonusAndDiscountListId;
        var prefix = defaultBonusAndDiscountListIdprefix;
        var doc = {
            defaultBonusAndDiscountListId: obj,
            docType: prefix

        };
        Buff(data).push(doc);//db.post(doc);
    },
    addCurrency: function (data, currency) {
        //var db = getPouchDb(data);
        var obj = currency;
        var prefix = currencyprefix;
        var doc = {
            currency: obj,
            docType: prefix

        };
        Buff(data).push(doc);//db.post(doc);
    },
    addBonusSkuMultiple: function (data, bonusSkuMultiple) {
        //var db = getPouchDb(data);
        var obj = bonusSkuMultiple;
        var prefix = bonusSkuMultiplesprfix;
        var doc = {
            bonusSkuMultiple: obj,
            docType: prefix

        };
        Buff(data).push(doc);//db.post(doc);
    },
    addDiscountListBySku: function (data, discountListXSku) {
        //var db = getPouchDb(data);
        var obj = discountListXSku;
        var prefix = discountListXSkuprfix;
        var doc = {
            discountListXSku: obj,
            docType: prefix

        };
        Buff(data).push(doc);//db.post(doc);
    },
    addBonusListBySku: function (data, bonusListXSku) {
        //var db = getPouchDb(data);
        var obj = bonusListXSku;
        var prefix = bonusListXSkuprefix;
        var doc = {
            bonusListXSku: obj,
            docType: prefix

        };
        Buff(data).push(doc);//db.post(doc);
    },
    addPriceXSkuScale: function (data, priceXSkuScale) {
        //var db = getPouchDb(data);
        var obj = priceXSkuScale;
        var prefix = priceXSkuScaleprefix+'-'+priceXSkuScale.CODE_PRICE_LIST+'-'+priceXSkuScale.CODE_SKU+'-'+priceXSkuScale.CODE_PACK_UNIT+'-'+priceXSkuScale.PRIORITY;
        var doc = {
            priceXSkuScale: obj,
            docType: prefix

        };
        Buff(data).push(doc);//db.post(doc);
    },
    addDefaultPackSku: function (data, defaultPackSku) {
        //var db = getPouchDb(data);
        var obj = defaultPackSku;
        var prefix = defaultPackSkuprefix;
        var doc = {
            defaultPackSku: obj,
            docType: prefix

        };
        Buff(data).push(doc);//db.post(doc);
    },
    addInvoiceDraft: function (data, invoiceDraft) {
        //var db = getPouchDb(data);
        var obj = invoiceDraft;
        var prefix = invoiceDraftprefix;
        var doc = {
            invoiceDraft: obj,
            docType: prefix

        };
        Buff(data).push(doc);//db.post(doc);
    },
    addSaleOrderDraft: function (data, saleOrderDraf) {
        //var db = getPouchDb(data);
        var obj = saleOrderDraf;
        var prefix = saleOrderDrafprefix;
        var doc = {
            saleOrderDraf: obj,
            docType: prefix

        };
        Buff(data).push(doc);//db.post(doc);
    },
    addItemHistory: function (data, itemHistory) {
        //var db = getPouchDb(data);
        var obj = itemHistory;
        var prefix = itemHistoryprefix;
        var doc = {
            itemHistory: obj,
            docType: prefix

        };
        Buff(data).push(doc);//db.post(doc);
    },
    addInvoice: function (data, invoice) {
        //var db = getPouchDb(data);
        var obj = invoice;
        var prefix = invoiceprefix;
        var doc = {
            invoice: obj,
            docType: prefix

        };
        Buff(data).push(doc);//db.post(doc);
    },
    addFamilySku: function (data, familySku) {
        //var db = getPouchDb(data);
        var obj = familySku;
        var prefix = familySkyprefix;
        var doc = {
            familySku: obj,
            docType: prefix

        };
        Buff(data).push(doc);//db.post(doc);
    },
    addPackConversion: function (data, packConversion) {
        var obj = packConversion;
        var prefix = packConversionprfix + packConversion.CODE_SKU;
        var doc = {
            packConversion: obj,
            docType: prefix

        };
        Buff(data).push(doc);//db.post(doc);
    },
    addPackUnit: function (data, packUnit) {
        //var db = getPouchDb(data);
        var obj = packUnit;
        var prefix = packUnitprefix;
        var doc = {
            packUnit: obj,
            docType: prefix

        };
        Buff(data).push(doc);//db.post(doc);
    },
    addTagXCustomer: function (data, tagXCustomer) {
        //var db = getPouchDb(data);
        var obj = tagXCustomer;
        var prefix = tagXCustomerprefix;
        var doc = {
            tagXCustomer: obj,
            docType: prefix

        };
        Buff(data).push(doc);//db.post(doc);
    },
    addCustomerFrequency: function (data, cutomerFrequency) {
        //var db = getPouchDb(data);
        var obj = cutomerFrequency;
        var prefix = cutomerFrequencyprefix;
        var doc = {
            cutomerFrequency: obj,
            docType: prefix

        };
        Buff(data).push(doc);//db.post(doc);
    },
    addToCustomer: function (data, customer) {
        //var db = getPouchDb(data);
        var obj = customer;
        var prefix = customerprefix+customer.CODE_CUSTOMER;
        var doc = {
            customer: obj,
            docType: prefix

        };
        Buff(data).push(doc);//db.post(doc);
    },
    addTag: function (data, tag) {
        //var db = getPouchDb(data);
        var obj = tag;
        var prefix = tagprefix;
        var doc = {
            tag: obj,
            docType: prefix

        };
        Buff(data).push(doc);//db.post(doc);
    },
    addSkuPresale: function (data, skuPresale) {
        //var db = getPouchDb(data);
        var obj = skuPresale;
        var prefix = skuPresaleprefix+ skuPresale.WAREHOUSE;
        var doc = {
            skuPresale: obj,
            history: { QTY_CONSIGNED: 0, QTY_SOLD: 0, QTY_COLLECTED: 0 },
            docType: prefix

        };
        Buff(data).push(doc);//db.post(doc);
    },
    createIndexes: function (data) {
        var db = new PouchDB(pouchDbService + getDbId(data));//,{ajax: {timeout: 600000}});   
        var buff = Buff(data);

        if (buff.length == 0)
            return Promise.reject("The locker is empty, please try again");

        return db.bulkDocs(buff).then(() => {
            routes[getDbId(data)] = null;
            return Promise.resolve();
        });
    }
    ,
    dommy: function (data, doc) {
        //var db = getPouchDb(data);
        buff.push(doc);//db.post(doc);
    }
}