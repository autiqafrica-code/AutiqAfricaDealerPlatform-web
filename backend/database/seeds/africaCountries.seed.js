'use strict'

/**
 * Africa Countries Seed
 * Upserts all 55 African countries (+ USD catch-all) into the countries table.
 * Run: node database/seeds/africaCountries.seed.js  (from backend/)
 * Also called from main seed.js.
 */

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const COUNTRIES = [
  { name: 'Algeria',                        iso2: 'DZ', iso3: 'DZA', isdCode: '213', currencyName: 'Algerian Dinar',             currencyCode: 'DZD', currencySymbol: 'DZD'   },
  { name: 'Angola',                         iso2: 'AO', iso3: 'AGO', isdCode: '244', currencyName: 'Angolan Kwanza',              currencyCode: 'AOA', currencySymbol: 'Kz'    },
  { name: 'Benin',                          iso2: 'BJ', iso3: 'BEN', isdCode: '229', currencyName: 'West African CFA Franc',      currencyCode: 'XOF', currencySymbol: 'CFA'   },
  { name: 'Botswana',                       iso2: 'BW', iso3: 'BWA', isdCode: '267', currencyName: 'Botswana Pula',               currencyCode: 'BWP', currencySymbol: 'P'     },
  { name: 'Burkina Faso',                   iso2: 'BF', iso3: 'BFA', isdCode: '226', currencyName: 'West African CFA Franc',      currencyCode: 'XOF', currencySymbol: 'CFA'   },
  { name: 'Burundi',                        iso2: 'BI', iso3: 'BDI', isdCode: '257', currencyName: 'Burundi Franc',               currencyCode: 'BIF', currencySymbol: 'FBu'   },
  { name: 'Cameroon',                       iso2: 'CM', iso3: 'CMR', isdCode: '237', currencyName: 'Central African CFA Franc',   currencyCode: 'XAF', currencySymbol: 'FCFA'  },
  { name: 'Cape Verde',                     iso2: 'CV', iso3: 'CPV', isdCode: '238', currencyName: 'Cape Verde Escudo',           currencyCode: 'CVE', currencySymbol: 'CVE'   },
  { name: 'Central African Republic',       iso2: 'CF', iso3: 'CAF', isdCode: '236', currencyName: 'Central African CFA Franc',   currencyCode: 'XAF', currencySymbol: 'FCFA'  },
  { name: 'Chad',                           iso2: 'TD', iso3: 'TCD', isdCode: '235', currencyName: 'Central African CFA Franc',   currencyCode: 'XAF', currencySymbol: 'FCFA'  },
  { name: 'Comoros',                        iso2: 'KM', iso3: 'COM', isdCode: '269', currencyName: 'Comorian Franc',              currencyCode: 'KMF', currencySymbol: 'FC'    },
  { name: 'Congo (Democratic Republic)',    iso2: 'CG', iso3: 'COG', isdCode: '243', currencyName: 'Congolese Franc',             currencyCode: 'CDF', currencySymbol: 'FC'    },
  { name: 'Congo (Republic of)',            iso2: 'CD', iso3: 'COD', isdCode: '242', currencyName: 'Central African CFA Franc',   currencyCode: 'XAF', currencySymbol: 'FCFA'  },
  { name: "Côte d'Ivoire",                  iso2: 'CI', iso3: 'CIV', isdCode: '225', currencyName: 'West African CFA Franc',      currencyCode: 'XOF', currencySymbol: 'CFA'   },
  { name: 'Djibouti',                       iso2: 'DJ', iso3: 'DJI', isdCode: '253', currencyName: 'Djiboutian Franc',            currencyCode: 'DJF', currencySymbol: 'Fdj'   },
  { name: 'Egypt',                          iso2: 'EG', iso3: 'EGY', isdCode: '20',  currencyName: 'Egyptian Pound',              currencyCode: 'EGP', currencySymbol: 'EGP'   },
  { name: 'Equatorial Guinea',              iso2: 'GQ', iso3: 'GNQ', isdCode: '240', currencyName: 'Central African CFA Franc',   currencyCode: 'XAF', currencySymbol: 'FCFA'  },
  { name: 'Eritrea',                        iso2: 'ER', iso3: 'ERI', isdCode: '291', currencyName: 'Eritrean Nakfa',              currencyCode: 'ERN', currencySymbol: 'Nfk'   },
  { name: 'Eswatini',                       iso2: 'SZ', iso3: 'SWZ', isdCode: '268', currencyName: 'Lilangeni',                   currencyCode: 'SZL', currencySymbol: 'L'     },
  { name: 'Ethiopia',                       iso2: 'ET', iso3: 'ETH', isdCode: '251', currencyName: 'Ethiopian Birr',              currencyCode: 'ETB', currencySymbol: 'Br'    },
  { name: 'Gabon',                          iso2: 'GA', iso3: 'GAB', isdCode: '241', currencyName: 'Central African CFA Franc',   currencyCode: 'XAF', currencySymbol: 'FCFA'  },
  { name: 'Gambia',                         iso2: 'GM', iso3: 'GMB', isdCode: '220', currencyName: 'Gambian Dalasi',              currencyCode: 'GMD', currencySymbol: 'D'     },
  { name: 'Ghana',                          iso2: 'GH', iso3: 'GHA', isdCode: '233', currencyName: 'Ghanaian Cedi',               currencyCode: 'GHS', currencySymbol: 'GHS'   },
  { name: 'Guinea',                         iso2: 'GN', iso3: 'GIN', isdCode: '224', currencyName: 'Guinean Franc',               currencyCode: 'GNF', currencySymbol: 'FG'    },
  { name: 'Guinea-Bissau',                  iso2: 'GW', iso3: 'GNB', isdCode: '245', currencyName: 'West African CFA Franc',      currencyCode: 'XOF', currencySymbol: 'CFA'   },
  { name: 'Kenya',                          iso2: 'KE', iso3: 'KEN', isdCode: '254', currencyName: 'Kenyan Shilling',             currencyCode: 'KES', currencySymbol: 'KSh'   },
  { name: 'Lesotho',                        iso2: 'LS', iso3: 'LSO', isdCode: '266', currencyName: 'Lesotho Loti',                currencyCode: 'LSL', currencySymbol: 'L'     },
  { name: 'Liberia',                        iso2: 'LR', iso3: 'LBR', isdCode: '231', currencyName: 'Liberian Dollar',             currencyCode: 'LRD', currencySymbol: 'LRD'   },
  { name: 'Libya',                          iso2: 'LY', iso3: 'LBY', isdCode: '218', currencyName: 'Libyan Dinar',                currencyCode: 'LYD', currencySymbol: 'LYD'   },
  { name: 'Madagascar',                     iso2: 'MG', iso3: 'MDG', isdCode: '261', currencyName: 'Malagasy Ariary',             currencyCode: 'MGA', currencySymbol: 'Ar'    },
  { name: 'Malawi',                         iso2: 'MW', iso3: 'MWI', isdCode: '265', currencyName: 'Malawian Kwacha',             currencyCode: 'MWK', currencySymbol: 'MK'    },
  { name: 'Mali',                           iso2: 'ML', iso3: 'MLI', isdCode: '223', currencyName: 'West African CFA Franc',      currencyCode: 'XOF', currencySymbol: 'CFA'   },
  { name: 'Mauritania',                     iso2: 'MR', iso3: 'MRT', isdCode: '222', currencyName: 'Mauritanian Ouguiya',         currencyCode: 'MRU', currencySymbol: 'UM'    },
  { name: 'Mauritius',                      iso2: 'MU', iso3: 'MUS', isdCode: '230', currencyName: 'Mauritian Rupee',             currencyCode: 'MUR', currencySymbol: 'Rs'    },
  { name: 'Morocco',                        iso2: 'MA', iso3: 'MAR', isdCode: '212', currencyName: 'Moroccan Dirham',             currencyCode: 'MAD', currencySymbol: 'DH'    },
  { name: 'Mozambique',                     iso2: 'MZ', iso3: 'MOZ', isdCode: '258', currencyName: 'Mozambican Metical',          currencyCode: 'MZN', currencySymbol: 'MT'    },
  { name: 'Namibia',                        iso2: 'NA', iso3: 'NAM', isdCode: '264', currencyName: 'Namibian Dollar',             currencyCode: 'NAD', currencySymbol: 'N$'    },
  { name: 'Niger',                          iso2: 'NE', iso3: 'NER', isdCode: '227', currencyName: 'West African CFA Franc',      currencyCode: 'XOF', currencySymbol: 'CFA'   },
  { name: 'Nigeria',                        iso2: 'NG', iso3: 'NGA', isdCode: '234', currencyName: 'Nigerian Naira',              currencyCode: 'NGN', currencySymbol: 'NGN'   },
  { name: 'Rwanda',                         iso2: 'RW', iso3: 'RWA', isdCode: '250', currencyName: 'Rwandan Franc',               currencyCode: 'RWF', currencySymbol: 'FRw'   },
  { name: 'São Tomé and Príncipe',          iso2: 'ST', iso3: 'STP', isdCode: '239', currencyName: 'Dobra',                       currencyCode: 'STN', currencySymbol: 'Db'    },
  { name: 'Senegal',                        iso2: 'SN', iso3: 'SEN', isdCode: '221', currencyName: 'West African CFA Franc',      currencyCode: 'XOF', currencySymbol: 'CFA'   },
  { name: 'Seychelles',                     iso2: 'SC', iso3: 'SYC', isdCode: '248', currencyName: 'Seychellois Rupee',           currencyCode: 'SCR', currencySymbol: 'Rs'    },
  { name: 'Sierra Leone',                   iso2: 'SL', iso3: 'SLE', isdCode: '232', currencyName: 'Sierra Leonean Leone',        currencyCode: 'SLE', currencySymbol: 'Le'    },
  { name: 'Somalia',                        iso2: 'SO', iso3: 'SOM', isdCode: '252', currencyName: 'Somali Shilling',             currencyCode: 'SOS', currencySymbol: 'Sh'    },
  { name: 'South Africa',                   iso2: 'ZA', iso3: 'ZAF', isdCode: '27',  currencyName: 'South African Rand',          currencyCode: 'ZAR', currencySymbol: 'R'     },
  { name: 'South Sudan',                    iso2: 'SS', iso3: 'SSD', isdCode: '211', currencyName: 'South Sudanese Pound',        currencyCode: 'SSP', currencySymbol: 'SSP'   },
  { name: 'Sudan',                          iso2: 'SD', iso3: 'SDN', isdCode: '249', currencyName: 'Sudanese Pound',              currencyCode: 'SDG', currencySymbol: 'SDG'   },
  { name: 'Tanzania',                       iso2: 'TZ', iso3: 'TZA', isdCode: '255', currencyName: 'Tanzanian Shilling',          currencyCode: 'TZS', currencySymbol: 'TSh'   },
  { name: 'Togo',                           iso2: 'TG', iso3: 'TGO', isdCode: '228', currencyName: 'West African CFA Franc',      currencyCode: 'XOF', currencySymbol: 'CFA'   },
  { name: 'Tunisia',                        iso2: 'TN', iso3: 'TUN', isdCode: '216', currencyName: 'Tunisian Dinar',              currencyCode: 'TND', currencySymbol: 'DT'    },
  { name: 'Uganda',                         iso2: 'UG', iso3: 'UGA', isdCode: '256', currencyName: 'Ugandan Shilling',            currencyCode: 'UGX', currencySymbol: 'USh'   },
  { name: 'Zambia',                         iso2: 'ZM', iso3: 'ZMB', isdCode: '260', currencyName: 'Zambian Kwacha',              currencyCode: 'ZMW', currencySymbol: 'K'     },
  { name: 'Zimbabwe',                       iso2: 'ZW', iso3: 'ZWE', isdCode: '263', currencyName: 'Zimbabwe Gold (ZiG)',         currencyCode: 'ZWG', currencySymbol: 'ZiG'   },
  { name: 'Other (USD)',                    iso2: 'OT', iso3: 'OTH', isdCode: '1',   currencyName: 'US Dollar',                   currencyCode: 'USD', currencySymbol: '$'     },
]

async function seedAfricaCountries() {
  console.log('  Seeding Africa countries…')
  let upserted = 0
  for (const c of COUNTRIES) {
    await prisma.country.upsert({
      where:  { iso2: c.iso2 },
      update: { name: c.name, iso3: c.iso3, isdCode: c.isdCode, currencyName: c.currencyName, currencyCode: c.currencyCode, currencySymbol: c.currencySymbol, isActive: true },
      create: { name: c.name, iso2: c.iso2, iso3: c.iso3, isdCode: c.isdCode, currencyName: c.currencyName, currencyCode: c.currencyCode, currencySymbol: c.currencySymbol, isActive: true },
    })
    upserted++
  }
  console.log(`  ✓  ${upserted} countries upserted`)
}

if (require.main === module) {
  seedAfricaCountries()
    .catch(e => { console.error('Country seed error:', e.message); process.exit(1) })
    .finally(() => prisma.$disconnect())
}

module.exports = { seedAfricaCountries }
