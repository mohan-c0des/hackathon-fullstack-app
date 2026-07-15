import os
import datetime
from typing import List, Dict, Any, cast, LiteralString, Optional
from neo4j import AsyncGraphDatabase
from dotenv import load_dotenv, find_dotenv

# 1. Force the database file to load the .env itself before doing anything!
load_dotenv(find_dotenv(), override=True)

class Neo4jGraphService:
    def __init__(self):
        uri = os.getenv("NEO4J_URI")
        
        # 2. Check for BOTH "NEO4J_USERNAME" and "NEO4J_USER" just in case!
        username = os.getenv("NEO4J_USERNAME") or os.getenv("NEO4J_USER")
        password = os.getenv("NEO4J_PASSWORD")

        if not uri or not username or not password:
            raise RuntimeError(f"Missing Neo4j connection environment variables. URI: {bool(uri)}, USER: {bool(username)}, PASS: {bool(password)}")
            
        self.driver = AsyncGraphDatabase.driver(
            str(uri), 
            auth=(str(username), str(password)),
            max_connection_lifetime=200 
        )

    async def close(self):
        """Safely close the driver pool connections."""
        await self.driver.close()

    async def verify_connection(self) -> bool:
        """Verifies the database is live and reachable."""
        async with self.driver.session() as session:
            result = await session.run(cast(LiteralString, "RETURN 1 AS num"))
            record = await result.single()
            if record is not None:
                return record["num"] == 1
            return False

    async def seed_geopolitical_network(self):
        """Seeds the graph with deep structural country traits and connections safely."""
        
        constraints = [
            "CREATE CONSTRAINT UNIQUE_COUNTRY_NAME IF NOT EXISTS FOR (c:Country) REQUIRE c.name IS UNIQUE",
            "CREATE CONSTRAINT UNIQUE_LANG_NAME IF NOT EXISTS FOR (l:Language) REQUIRE l.name IS UNIQUE",
            "CREATE CONSTRAINT UNIQUE_CURR_CODE IF NOT EXISTS FOR (cu:Currency) REQUIRE cu.code IS UNIQUE",
            "CREATE CONSTRAINT UNIQUE_CULTURE_NAME IF NOT EXISTS FOR (g:CultureGroup) REQUIRE g.name IS UNIQUE"
        ]
        
        seed_data_query = """
        // 1. Create Core Nodes (ONLY using name to prevent ConstraintValidationFailed)
        MERGE (usa:Country {name: 'United States'})
        MERGE (chn:Country {name: 'China'})
        MERGE (rus:Country {name: 'Russia'})
        MERGE (ind:Country {name: 'India'})
        MERGE (jpn:Country {name: 'Japan'})
        MERGE (gbr:Country {name: 'United Kingdom'})
        MERGE (fra:Country {name: 'France'})
        MERGE (deu:Country {name: 'Germany'})
        MERGE (bra:Country {name: 'Brazil'})
        MERGE (zaf:Country {name: 'South Africa'})
        MERGE (sau:Country {name: 'Saudi Arabia'})
        MERGE (kor:Country {name: 'South Korea'})
        MERGE (aus:Country {name: 'Australia'})
        MERGE (can:Country {name: 'Canada'})
        MERGE (egy:Country {name: 'Egypt'})

        // 2. Shared Attributes
        MERGE (eng:Language {name: 'English'})
        MERGE (man:Language {name: 'Mandarin'})
        MERGE (ara:Language {name: 'Arabic'})
        MERGE (fre:Language {name: 'French'})
        MERGE (hi:Language {name: 'Hindi'})
        MERGE (te:Language {name: 'Telugu'})
        MERGE (ja:Language {name: 'Japanese'})
        
        MERGE (usd:Currency {code: 'USD', name: 'US Dollar'})
        MERGE (eur:Currency {code: 'EUR', name: 'Euro'})
        MERGE (inr:Currency {code: 'INR', name: 'Indian Rupee'})
        MERGE (jpy:Currency {code: 'JPY', name: 'Japanese Yen'})
        
        MERGE (west:CultureGroup {name: 'Western'})
        MERGE (asia:CultureGroup {name: 'East Asian'})
        MERGE (arab:CultureGroup {name: 'Arab World'})
        MERGE (brics:CultureGroup {name: 'Global South'})
        MERGE (anglo:CultureGroup {name: 'Anglosphere'})
        MERGE (southasia:CultureGroup {name: 'South Asian'})

        // 3. Map Languages
        MERGE (usa)-[:SPEAKS]->(eng)
        MERGE (gbr)-[:SPEAKS]->(eng)
        MERGE (aus)-[:SPEAKS]->(eng)
        MERGE (can)-[:SPEAKS]->(eng)
        MERGE (ind)-[:SPEAKS]->(eng)
        MERGE (ind)-[:SPEAKS]->(hi)
        MERGE (ind)-[:SPEAKS]->(te)
        MERGE (zaf)-[:SPEAKS]->(eng)
        MERGE (fra)-[:SPEAKS]->(fre)
        MERGE (can)-[:SPEAKS]->(fre)
        MERGE (chn)-[:SPEAKS]->(man)
        MERGE (sau)-[:SPEAKS]->(ara)
        MERGE (egy)-[:SPEAKS]->(ara)
        MERGE (jpn)-[:SPEAKS]->(ja)

        // 4. Map Currencies
        MERGE (usa)-[:USES]->(usd)
        MERGE (fra)-[:USES]->(eur)
        MERGE (deu)-[:USES]->(eur)
        MERGE (sau)-[:USES]->(usd)
        MERGE (egy)-[:USES]->(usd)
        MERGE (ind)-[:USES]->(inr)
        MERGE (jpn)-[:USES]->(jpy)

        // 5. Map Cultures
        MERGE (usa)-[:BELONGS_TO]->(west)
        MERGE (gbr)-[:BELONGS_TO]->(west)
        MERGE (fra)-[:BELONGS_TO]->(west)
        MERGE (deu)-[:BELONGS_TO]->(west)
        MERGE (aus)-[:BELONGS_TO]->(west)
        MERGE (can)-[:BELONGS_TO]->(west)
        MERGE (usa)-[:BELONGS_TO]->(anglo)
        MERGE (gbr)-[:BELONGS_TO]->(anglo)
        MERGE (aus)-[:BELONGS_TO]->(anglo)
        MERGE (can)-[:BELONGS_TO]->(anglo)
        MERGE (chn)-[:BELONGS_TO]->(asia)
        MERGE (jpn)-[:BELONGS_TO]->(asia)
        MERGE (kor)-[:BELONGS_TO]->(asia)
        MERGE (sau)-[:BELONGS_TO]->(arab)
        MERGE (egy)-[:BELONGS_TO]->(arab)
        MERGE (bra)-[:BELONGS_TO]->(brics)
        MERGE (rus)-[:BELONGS_TO]->(brics)
        MERGE (ind)-[:BELONGS_TO]->(brics)
        MERGE (chn)-[:BELONGS_TO]->(brics)
        MERGE (zaf)-[:BELONGS_TO]->(brics)
        MERGE (ind)-[:BELONGS_TO]->(southasia)

        // 6. Map Strategic Alliances
        MERGE (usa)-[:DEEP_RELATION {type: 'NATO'}]-(gbr)
        MERGE (usa)-[:DEEP_RELATION {type: 'NATO'}]-(fra)
        MERGE (usa)-[:DEEP_RELATION {type: 'NATO'}]-(deu)
        MERGE (usa)-[:DEEP_RELATION {type: 'NATO'}]-(can)
        MERGE (gbr)-[:DEEP_RELATION {type: 'NATO'}]-(fra)
        MERGE (usa)-[:DEEP_RELATION {type: 'Strategic Allied Alliance'}]-(gbr)
        MERGE (usa)-[:DEEP_RELATION {type: 'QUAD'}]-(ind)
        MERGE (usa)-[:DEEP_RELATION {type: 'QUAD'}]-(jpn)
        MERGE (usa)-[:DEEP_RELATION {type: 'QUAD'}]-(aus)
        MERGE (ind)-[:DEEP_RELATION {type: 'QUAD'}]-(jpn)
        MERGE (ind)-[:DEEP_RELATION {type: 'QUAD'}]-(aus)
        MERGE (chn)-[:DEEP_RELATION {type: 'Strategic Partnership'}]-(rus)
        MERGE (usa)-[:DEEP_RELATION {type: 'Security Pact'}]-(kor)
        MERGE (usa)-[:DEEP_RELATION {type: 'Security Pact'}]-(sau)
        MERGE (sau)-[:DEEP_RELATION {type: 'Regional Alliance'}]-(egy)
        MERGE (ind)-[:DEEP_RELATION {type: 'Economic tech corridor'}]-(usa)
        MERGE (ind)-[:DEEP_RELATION {type: 'Infrastructure pact'}]-(jpn)

        // 7. Add More Major Countries (Europe, Asia, Americas, Africa, Middle East, Oceania)
        MERGE (ita:Country {name: 'Italy'})
        MERGE (esp:Country {name: 'Spain'})
        MERGE (nld:Country {name: 'Netherlands'})
        MERGE (che:Country {name: 'Switzerland'})
        MERGE (swe:Country {name: 'Sweden'})
        MERGE (nor:Country {name: 'Norway'})
        MERGE (pol:Country {name: 'Poland'})
        MERGE (grc:Country {name: 'Greece'})
        MERGE (tur:Country {name: 'Turkey'})
        MERGE (sgp:Country {name: 'Singapore'})
        MERGE (vnm:Country {name: 'Vietnam'})
        MERGE (tha:Country {name: 'Thailand'})
        MERGE (idn:Country {name: 'Indonesia'})
        MERGE (mys:Country {name: 'Malaysia'})
        MERGE (phl:Country {name: 'Philippines'})
        MERGE (are:Country {name: 'United Arab Emirates'})
        MERGE (isr:Country {name: 'Israel'})
        MERGE (qtr:Country {name: 'Qatar'})
        MERGE (mex:Country {name: 'Mexico'})
        MERGE (arg:Country {name: 'Argentina'})
        MERGE (col:Country {name: 'Colombia'})
        MERGE (chl:Country {name: 'Chile'})
        MERGE (per:Country {name: 'Peru'})
        MERGE (nga:Country {name: 'Nigeria'})
        MERGE (ken:Country {name: 'Kenya'})
        MERGE (mar:Country {name: 'Morocco'})
        MERGE (eth:Country {name: 'Ethiopia'})
        MERGE (tza:Country {name: 'Tanzania'})
        MERGE (nzl:Country {name: 'New Zealand'})
        MERGE (irl:Country {name: 'Ireland'})
        MERGE (prt:Country {name: 'Portugal'})
        MERGE (aut:Country {name: 'Austria'})

        // 8. Add More Languages
        MERGE (spa:Language {name: 'Spanish'})
        MERGE (por:Language {name: 'Portuguese'})
        MERGE (ger:Language {name: 'German'})
        MERGE (ita_lang:Language {name: 'Italian'})
        MERGE (rus_lang:Language {name: 'Russian'})
        MERGE (kor_lang:Language {name: 'Korean'})
        MERGE (tur_lang:Language {name: 'Turkish'})
        MERGE (vie:Language {name: 'Vietnamese'})
        MERGE (tha_lang:Language {name: 'Thai'})
        MERGE (ind_lang:Language {name: 'Indonesian'})
        MERGE (msa:Language {name: 'Malay'})
        MERGE (swa:Language {name: 'Swahili'})
        MERGE (nld_lang:Language {name: 'Dutch'})
        MERGE (heb:Language {name: 'Hebrew'})
        MERGE (ell:Language {name: 'Greek'})
        MERGE (swe_lang:Language {name: 'Swedish'})
        MERGE (nor_lang:Language {name: 'Norwegian'})
        MERGE (pol_lang:Language {name: 'Polish'})
        MERGE (tam:Language {name: 'Tamil'})

        // 9. Add More Currencies & Connect Missing Old Currencies
        MERGE (gbp:Currency {code: 'GBP', name: 'British Pound'})
        MERGE (cny:Currency {code: 'CNY', name: 'Chinese Yuan'})
        MERGE (cad:Currency {code: 'CAD', name: 'Canadian Dollar'})
        MERGE (aud:Currency {code: 'AUD', name: 'Australian Dollar'})
        MERGE (brl:Currency {code: 'BRL', name: 'Brazilian Real'})
        MERGE (zar:Currency {code: 'ZAR', name: 'South African Rand'})
        MERGE (rub:Currency {code: 'RUB', name: 'Russian Ruble'})
        MERGE (krw:Currency {code: 'KRW', name: 'South Korean Won'})
        MERGE (sgd:Currency {code: 'SGD', name: 'Singapore Dollar'})
        MERGE (chf:Currency {code: 'CHF', name: 'Swiss Franc'})
        MERGE (aed:Currency {code: 'AED', name: 'UAE Dirham'})
        MERGE (mxn:Currency {code: 'MXN', name: 'Mexican Peso'})
        MERGE (thb:Currency {code: 'THB', name: 'Thai Baht'})
        MERGE (idr:Currency {code: 'IDR', name: 'Indonesian Rupiah'})
        MERGE (try_curr:Currency {code: 'TRY', name: 'Turkish Lira'})
        MERGE (ngn:Currency {code: 'NGN', name: 'Nigerian Naira'})

        // 10. Add New Culture Groups
        MERGE (latam:CultureGroup {name: 'Latin America'})
        MERGE (sea:CultureGroup {name: 'Southeast Asian'})
        MERGE (nordic:CultureGroup {name: 'Nordic'})
        MERGE (med:CultureGroup {name: 'Mediterranean'})
        MERGE (eu_group:CultureGroup {name: 'European Union'})
        MERGE (ssa:CultureGroup {name: 'Sub-Saharan Africa'})

        // 11. Map New & Missing Languages
        MERGE (deu)-[:SPEAKS]->(ger)
        MERGE (che)-[:SPEAKS]->(ger)
        MERGE (che)-[:SPEAKS]->(fre)
        MERGE (che)-[:SPEAKS]->(ita_lang)
        MERGE (aut)-[:SPEAKS]->(ger)
        MERGE (bra)-[:SPEAKS]->(por)
        MERGE (prt)-[:SPEAKS]->(por)
        MERGE (rus)-[:SPEAKS]->(rus_lang)
        MERGE (kor)-[:SPEAKS]->(kor_lang)
        MERGE (ita)-[:SPEAKS]->(ita_lang)
        MERGE (esp)-[:SPEAKS]->(spa)
        MERGE (mex)-[:SPEAKS]->(spa)
        MERGE (arg)-[:SPEAKS]->(spa)
        MERGE (col)-[:SPEAKS]->(spa)
        MERGE (chl)-[:SPEAKS]->(spa)
        MERGE (per)-[:SPEAKS]->(spa)
        MERGE (nld)-[:SPEAKS]->(nld_lang)
        MERGE (swe)-[:SPEAKS]->(swe_lang)
        MERGE (nor)-[:SPEAKS]->(nor_lang)
        MERGE (pol)-[:SPEAKS]->(pol_lang)
        MERGE (grc)-[:SPEAKS]->(ell)
        MERGE (tur)-[:SPEAKS]->(tur_lang)
        MERGE (sgp)-[:SPEAKS]->(eng)
        MERGE (sgp)-[:SPEAKS]->(man)
        MERGE (sgp)-[:SPEAKS]->(msa)
        MERGE (sgp)-[:SPEAKS]->(tam)
        MERGE (vnm)-[:SPEAKS]->(vie)
        MERGE (tha)-[:SPEAKS]->(tha_lang)
        MERGE (idn)-[:SPEAKS]->(ind_lang)
        MERGE (mys)-[:SPEAKS]->(msa)
        MERGE (are)-[:SPEAKS]->(ara)
        MERGE (qtr)-[:SPEAKS]->(ara)
        MERGE (mar)-[:SPEAKS]->(ara)
        MERGE (mar)-[:SPEAKS]->(fre)
        MERGE (isr)-[:SPEAKS]->(heb)
        MERGE (nga)-[:SPEAKS]->(eng)
        MERGE (ken)-[:SPEAKS]->(eng)
        MERGE (ken)-[:SPEAKS]->(swa)
        MERGE (tza)-[:SPEAKS]->(swa)
        MERGE (nzl)-[:SPEAKS]->(eng)
        MERGE (irl)-[:SPEAKS]->(eng)

        // 12. Map New & Missing Currencies
        MERGE (gbr)-[:USES]->(gbp)
        MERGE (chn)-[:USES]->(cny)
        MERGE (can)-[:USES]->(cad)
        MERGE (aus)-[:USES]->(aud)
        MERGE (bra)-[:USES]->(brl)
        MERGE (zaf)-[:USES]->(zar)
        MERGE (rus)-[:USES]->(rub)
        MERGE (kor)-[:USES]->(krw)
        MERGE (ita)-[:USES]->(eur)
        MERGE (esp)-[:USES]->(eur)
        MERGE (nld)-[:USES]->(eur)
        MERGE (irl)-[:USES]->(eur)
        MERGE (prt)-[:USES]->(eur)
        MERGE (aut)-[:USES]->(eur)
        MERGE (grc)-[:USES]->(eur)
        MERGE (che)-[:USES]->(chf)
        MERGE (sgp)-[:USES]->(sgd)
        MERGE (are)-[:USES]->(aed)
        MERGE (mex)-[:USES]->(mxn)
        MERGE (tha)-[:USES]->(thb)
        MERGE (idn)-[:USES]->(idr)
        MERGE (tur)-[:USES]->(try_curr)
        MERGE (nga)-[:USES]->(ngn)
        MERGE (nzl)-[:USES]->(aud)

        // 13. Map New Culture Groups
        MERGE (ita)-[:BELONGS_TO]->(west)
        MERGE (ita)-[:BELONGS_TO]->(med)
        MERGE (ita)-[:BELONGS_TO]->(eu_group)
        MERGE (esp)-[:BELONGS_TO]->(west)
        MERGE (esp)-[:BELONGS_TO]->(med)
        MERGE (esp)-[:BELONGS_TO]->(eu_group)
        MERGE (grc)-[:BELONGS_TO]->(med)
        MERGE (grc)-[:BELONGS_TO]->(eu_group)
        MERGE (nld)-[:BELONGS_TO]->(west)
        MERGE (nld)-[:BELONGS_TO]->(eu_group)
        MERGE (che)-[:BELONGS_TO]->(west)
        MERGE (aut)-[:BELONGS_TO]->(west)
        MERGE (aut)-[:BELONGS_TO]->(eu_group)
        MERGE (irl)-[:BELONGS_TO]->(west)
        MERGE (irl)-[:BELONGS_TO]->(anglo)
        MERGE (irl)-[:BELONGS_TO]->(eu_group)
        MERGE (swe)-[:BELONGS_TO]->(nordic)
        MERGE (swe)-[:BELONGS_TO]->(eu_group)
        MERGE (nor)-[:BELONGS_TO]->(nordic)
        MERGE (pol)-[:BELONGS_TO]->(west)
        MERGE (pol)-[:BELONGS_TO]->(eu_group)
        MERGE (fra)-[:BELONGS_TO]->(eu_group)
        MERGE (fra)-[:BELONGS_TO]->(med)
        MERGE (deu)-[:BELONGS_TO]->(eu_group)
        MERGE (prt)-[:BELONGS_TO]->(med)
        MERGE (prt)-[:BELONGS_TO]->(eu_group)
        
        MERGE (bra)-[:BELONGS_TO]->(latam)
        MERGE (mex)-[:BELONGS_TO]->(latam)
        MERGE (arg)-[:BELONGS_TO]->(latam)
        MERGE (col)-[:BELONGS_TO]->(latam)
        MERGE (chl)-[:BELONGS_TO]->(latam)
        MERGE (per)-[:BELONGS_TO]->(latam)
        MERGE (mex)-[:BELONGS_TO]->(brics)
        MERGE (arg)-[:BELONGS_TO]->(brics)

        MERGE (sgp)-[:BELONGS_TO]->(sea)
        MERGE (vnm)-[:BELONGS_TO]->(sea)
        MERGE (tha)-[:BELONGS_TO]->(sea)
        MERGE (idn)-[:BELONGS_TO]->(sea)
        MERGE (mys)-[:BELONGS_TO]->(sea)
        MERGE (phl)-[:BELONGS_TO]->(sea)
        MERGE (idn)-[:BELONGS_TO]->(brics)

        MERGE (are)-[:BELONGS_TO]->(arab)
        MERGE (qtr)-[:BELONGS_TO]->(arab)
        MERGE (mar)-[:BELONGS_TO]->(arab)
        MERGE (tur)-[:BELONGS_TO]->(med)
        
        MERGE (nga)-[:BELONGS_TO]->(ssa)
        MERGE (ken)-[:BELONGS_TO]->(ssa)
        MERGE (eth)-[:BELONGS_TO]->(ssa)
        MERGE (tza)-[:BELONGS_TO]->(ssa)
        MERGE (zaf)-[:BELONGS_TO]->(ssa)

        MERGE (nzl)-[:BELONGS_TO]->(west)
        MERGE (nzl)-[:BELONGS_TO]->(anglo)

        // 14. Dense Strategic, Economic & Regional Alliances
        // ASEAN
        MERGE (sgp)-[:DEEP_RELATION {type: 'ASEAN'}]-(idn)
        MERGE (sgp)-[:DEEP_RELATION {type: 'ASEAN'}]-(mys)
        MERGE (sgp)-[:DEEP_RELATION {type: 'ASEAN'}]-(tha)
        MERGE (idn)-[:DEEP_RELATION {type: 'ASEAN'}]-(mys)
        MERGE (idn)-[:DEEP_RELATION {type: 'ASEAN'}]-(vnm)
        MERGE (tha)-[:DEEP_RELATION {type: 'ASEAN'}]-(vnm)
        MERGE (phl)-[:DEEP_RELATION {type: 'ASEAN'}]-(sgp)

        // EU Core Axis & Schengen
        MERGE (fra)-[:DEEP_RELATION {type: 'EU Core Axis'}]-(deu)
        MERGE (fra)-[:DEEP_RELATION {type: 'EU Core Axis'}]-(ita)
        MERGE (deu)-[:DEEP_RELATION {type: 'EU Core Axis'}]-(ita)
        MERGE (esp)-[:DEEP_RELATION {type: 'EU Core Axis'}]-(prt)
        MERGE (deu)-[:DEEP_RELATION {type: 'EU Core Axis'}]-(nld)
        MERGE (deu)-[:DEEP_RELATION {type: 'EU Core Axis'}]-(pol)
        MERGE (aut)-[:DEEP_RELATION {type: 'EU Core Axis'}]-(deu)
        
        // USMCA (North American Trade Corridor)
        MERGE (usa)-[:DEEP_RELATION {type: 'USMCA Trade Pact'}]-(mex)
        MERGE (usa)-[:DEEP_RELATION {type: 'USMCA Trade Pact'}]-(can)
        MERGE (can)-[:DEEP_RELATION {type: 'USMCA Trade Pact'}]-(mex)

        // Mercosur & Latin America Trade
        MERGE (bra)-[:DEEP_RELATION {type: 'Mercosur'}]-(arg)
        MERGE (col)-[:DEEP_RELATION {type: 'Pacific Alliance'}]-(chl)
        MERGE (col)-[:DEEP_RELATION {type: 'Pacific Alliance'}]-(per)
        MERGE (mex)-[:DEEP_RELATION {type: 'Pacific Alliance'}]-(col)

        // Intelligence & Defense (Five Eyes, AUKUS, NATO additions)
        MERGE (usa)-[:DEEP_RELATION {type: 'Five Eyes Intelligence'}]-(gbr)
        MERGE (usa)-[:DEEP_RELATION {type: 'Five Eyes Intelligence'}]-(can)
        MERGE (usa)-[:DEEP_RELATION {type: 'Five Eyes Intelligence'}]-(aus)
        MERGE (usa)-[:DEEP_RELATION {type: 'Five Eyes Intelligence'}]-(nzl)
        MERGE (gbr)-[:DEEP_RELATION {type: 'Five Eyes Intelligence'}]-(aus)
        MERGE (aus)-[:DEEP_RELATION {type: 'AUKUS Defense Pact'}]-(gbr)
        MERGE (aus)-[:DEEP_RELATION {type: 'AUKUS Defense Pact'}]-(usa)
        MERGE (aus)-[:DEEP_RELATION {type: 'Trans-Tasman Travel Arrangement'}]-(nzl)
        MERGE (ita)-[:DEEP_RELATION {type: 'NATO'}]-(usa)
        MERGE (esp)-[:DEEP_RELATION {type: 'NATO'}]-(fra)
        MERGE (pol)-[:DEEP_RELATION {type: 'NATO'}]-(usa)
        MERGE (tur)-[:DEEP_RELATION {type: 'NATO'}]-(usa)
        MERGE (nor)-[:DEEP_RELATION {type: 'NATO'}]-(gbr)
        MERGE (swe)-[:DEEP_RELATION {type: 'NATO'}]-(nor)

        // Middle East & Africa Economic Corridors
        MERGE (are)-[:DEEP_RELATION {type: 'Abraham Accords & Tech Pact'}]-(isr)
        MERGE (are)-[:DEEP_RELATION {type: 'GCC Economic Bloc'}]-(sau)
        MERGE (are)-[:DEEP_RELATION {type: 'GCC Economic Bloc'}]-(qtr)
        MERGE (sau)-[:DEEP_RELATION {type: 'GCC Economic Bloc'}]-(qtr)
        MERGE (ind)-[:DEEP_RELATION {type: 'IMEC Trade Corridor'}]-(are)
        MERGE (ind)-[:DEEP_RELATION {type: 'IMEC Trade Corridor'}]-(sau)
        MERGE (ken)-[:DEEP_RELATION {type: 'East African Community'}]-(tza)
        MERGE (nga)-[:DEEP_RELATION {type: 'African Continental Free Trade'}]-(zaf)
        MERGE (eth)-[:DEEP_RELATION {type: 'African Continental Free Trade'}]-(ken)

        // 15. More Global Destinations (Balkans, Caribbean, Central Asia, Islands)
        MERGE (hrv:Country {name: 'Croatia'})
        MERGE (cze:Country {name: 'Czech Republic'})
        MERGE (hun:Country {name: 'Hungary'})
        MERGE (bel:Country {name: 'Belgium'})
        MERGE (dnk:Country {name: 'Denmark'})
        MERGE (fin:Country {name: 'Finland'})
        MERGE (isl:Country {name: 'Iceland'})
        MERGE (cri:Country {name: 'Costa Rica'})
        MERGE (pan:Country {name: 'Panama'})
        MERGE (jam:Country {name: 'Jamaica'})
        MERGE (cub:Country {name: 'Cuba'})
        MERGE (lka:Country {name: 'Sri Lanka'})
        MERGE (npl:Country {name: 'Nepal'})
        MERGE (mdv:Country {name: 'Maldives'})
        MERGE (kaz:Country {name: 'Kazakhstan'})
        MERGE (omn:Country {name: 'Oman'})
        MERGE (jor:Country {name: 'Jordan'})
        MERGE (gha:Country {name: 'Ghana'})

        // 16. Languages & Currencies
        MERGE (hrv_lang:Language {name: 'Croatian'})
        MERGE (cze_lang:Language {name: 'Czech'})
        MERGE (hun_lang:Language {name: 'Hungarian'})
        MERGE (fin_lang:Language {name: 'Finnish'})
        MERGE (sin:Language {name: 'Sinhala'})
        MERGE (kaz_lang:Language {name: 'Kazakh'})
        MERGE (npl_lang:Language {name: 'Nepali'})

        MERGE (czk:Currency {code: 'CZK', name: 'Czech Koruna'})
        MERGE (huf:Currency {code: 'HUF', name: 'Hungarian Forint'})
        MERGE (dkk:Currency {code: 'DKK', name: 'Danish Krone'})
        MERGE (sek:Currency {code: 'SEK', name: 'Swedish Krona'})
        MERGE (kzt:Currency {code: 'KZT', name: 'Kazakhstani Tenge'})
        MERGE (lkr:Currency {code: 'LKR', name: 'Sri Lankan Rupee'})

        // 17. Map Languages and Currencies
        MERGE (hrv)-[:SPEAKS]->(hrv_lang)
        MERGE (cze)-[:SPEAKS]->(cze_lang)
        MERGE (hun)-[:SPEAKS]->(hun_lang)
        MERGE (fin)-[:SPEAKS]->(fin_lang)
        MERGE (fin)-[:SPEAKS]->(swe_lang) // Swedish is also spoken in Finland
        MERGE (bel)-[:SPEAKS]->(fre)
        MERGE (bel)-[:SPEAKS]->(nld_lang) // Dutch/Flemish
        MERGE (bel)-[:SPEAKS]->(ger)
        MERGE (dnk)-[:SPEAKS]->(eng)
        MERGE (cri)-[:SPEAKS]->(spa)
        MERGE (pan)-[:SPEAKS]->(spa)
        MERGE (cub)-[:SPEAKS]->(spa)
        MERGE (jam)-[:SPEAKS]->(eng)
        MERGE (lka)-[:SPEAKS]->(sin)
        MERGE (lka)-[:SPEAKS]->(tam)
        MERGE (npl)-[:SPEAKS]->(npl_lang)
        MERGE (kaz)-[:SPEAKS]->(kaz_lang)
        MERGE (kaz)-[:SPEAKS]->(rus_lang)
        MERGE (omn)-[:SPEAKS]->(ara)
        MERGE (jor)-[:SPEAKS]->(ara)
        MERGE (gha)-[:SPEAKS]->(eng)

        MERGE (hrv)-[:USES]->(eur)
        MERGE (bel)-[:USES]->(eur)
        MERGE (fin)-[:USES]->(eur)
        MERGE (cze)-[:USES]->(czk)
        MERGE (hun)-[:USES]->(huf)
        MERGE (dnk)-[:USES]->(dkk)
        MERGE (swe)-[:USES]->(sek)
        MERGE (kaz)-[:USES]->(kzt)
        MERGE (lka)-[:USES]->(lkr)
        MERGE (pan)-[:USES]->(usd)

        // 18. New Culture Groups
        MERGE (balkan:CultureGroup {name: 'Balkan'})
        MERGE (carib:CultureGroup {name: 'Caribbean'})
        MERGE (centralasia:CultureGroup {name: 'Central Asian'})

        MERGE (hrv)-[:BELONGS_TO]->(balkan)
        MERGE (grc)-[:BELONGS_TO]->(balkan)
        MERGE (cub)-[:BELONGS_TO]->(carib)
        MERGE (jam)-[:BELONGS_TO]->(carib)
        MERGE (kaz)-[:BELONGS_TO]->(centralasia)
        MERGE (lka)-[:BELONGS_TO]->(southasia)
        MERGE (npl)-[:BELONGS_TO]->(southasia)
        MERGE (mdv)-[:BELONGS_TO]->(southasia)

        // 19. Mega Travel & Geopolitical Alliances
        
        // The Schengen Area (MASSIVE for travel - no border checks between these!)
        MERGE (fra)-[:DEEP_RELATION {type: 'Schengen Borderless Zone'}]-(deu)
        MERGE (fra)-[:DEEP_RELATION {type: 'Schengen Borderless Zone'}]-(esp)
        MERGE (esp)-[:DEEP_RELATION {type: 'Schengen Borderless Zone'}]-(prt)
        MERGE (deu)-[:DEEP_RELATION {type: 'Schengen Borderless Zone'}]-(aut)
        MERGE (aut)-[:DEEP_RELATION {type: 'Schengen Borderless Zone'}]-(cze)
        MERGE (cze)-[:DEEP_RELATION {type: 'Schengen Borderless Zone'}]-(pol)
        MERGE (aut)-[:DEEP_RELATION {type: 'Schengen Borderless Zone'}]-(ita)
        MERGE (ita)-[:DEEP_RELATION {type: 'Schengen Borderless Zone'}]-(hrv)
        MERGE (deu)-[:DEEP_RELATION {type: 'Schengen Borderless Zone'}]-(nld)
        MERGE (nld)-[:DEEP_RELATION {type: 'Schengen Borderless Zone'}]-(bel)
        MERGE (swe)-[:DEEP_RELATION {type: 'Schengen Borderless Zone'}]-(nor)
        MERGE (swe)-[:DEEP_RELATION {type: 'Schengen Borderless Zone'}]-(fin)
        MERGE (swe)-[:DEEP_RELATION {type: 'Schengen Borderless Zone'}]-(dnk)
        MERGE (che)-[:DEEP_RELATION {type: 'Schengen Borderless Zone'}]-(deu)
        MERGE (grc)-[:DEEP_RELATION {type: 'Schengen Borderless Zone'}]-(ita)

        // Expanded BRICS+ (The 2024 Additions)
        MERGE (are)-[:DEEP_RELATION {type: 'BRICS+'}]-(sau)
        MERGE (are)-[:DEEP_RELATION {type: 'BRICS+'}]-(egy)
        MERGE (are)-[:DEEP_RELATION {type: 'BRICS+'}]-(eth)
        MERGE (ind)-[:DEEP_RELATION {type: 'BRICS+'}]-(are)
        MERGE (chn)-[:DEEP_RELATION {type: 'BRICS+'}]-(sau)
        MERGE (rus)-[:DEEP_RELATION {type: 'BRICS+'}]-(egy)
        MERGE (bra)-[:DEEP_RELATION {type: 'BRICS+'}]-(eth)

        // Commonwealth of Nations (Shared legal systems, English fluency, cricket culture)
        MERGE (gbr)-[:DEEP_RELATION {type: 'Commonwealth'}]-(ind)
        MERGE (gbr)-[:DEEP_RELATION {type: 'Commonwealth'}]-(aus)
        MERGE (gbr)-[:DEEP_RELATION {type: 'Commonwealth'}]-(can)
        MERGE (gbr)-[:DEEP_RELATION {type: 'Commonwealth'}]-(zaf)
        MERGE (gbr)-[:DEEP_RELATION {type: 'Commonwealth'}]-(nga)
        MERGE (gbr)-[:DEEP_RELATION {type: 'Commonwealth'}]-(ken)
        MERGE (gbr)-[:DEEP_RELATION {type: 'Commonwealth'}]-(jam)
        MERGE (gbr)-[:DEEP_RELATION {type: 'Commonwealth'}]-(lka)

        // OPEC (Oil economies - highly relevant for global business travel)
        MERGE (sau)-[:DEEP_RELATION {type: 'OPEC'}]-(are)
        MERGE (sau)-[:DEEP_RELATION {type: 'OPEC'}]-(nga)
        MERGE (are)-[:DEEP_RELATION {type: 'OPEC'}]-(qtr)

        // Belt and Road Initiative (Infrastructure & New Trade paths)
        MERGE (chn)-[:DEEP_RELATION {type: 'Belt & Road (BRI)'}]-(kaz)
        MERGE (chn)-[:DEEP_RELATION {type: 'Belt & Road (BRI)'}]-(lka)
        MERGE (chn)-[:DEEP_RELATION {type: 'Belt & Road (BRI)'}]-(npl)
        MERGE (chn)-[:DEEP_RELATION {type: 'Belt & Road (BRI)'}]-(ken)
        MERGE (chn)-[:DEEP_RELATION {type: 'Belt & Road (BRI)'}]-(ita)
        """
        
        async with self.driver.session() as session:
            for query in constraints:
                await session.run(cast(LiteralString, query))
            await session.run(cast(LiteralString, seed_data_query))

    async def log_user_search(self, user_id: str, country_name: str, purpose: str):
        
        if user_id == "guest_user":
            return 
            
        query = """
        MERGE (u:User {id: $user_id})
        ON CREATE SET u.created_at = timestamp()
        MERGE (c:Country {name: $country_name}) // <--- THE FIX: Changed MATCH to MERGE
        CREATE (u)-[:SEARCHED {purpose: $purpose, timestamp: $timestamp}]->(c)
        """
        async with self.driver.session() as session:
            await session.run(
                cast(LiteralString, query), 
                user_id=user_id, 
                country_name=country_name.title(), 
                purpose=purpose,
                timestamp=datetime.datetime.utcnow().isoformat()
            )

    async def get_similar_countries(self, country_name: str) -> List[Dict[str, Any]]:
        query = """
        MATCH (target:Country {name: $country_name})
        MATCH (target)-[:SPEAKS|USES|BELONGS_TO|DEEP_RELATION]-(trait)--(neighbor:Country)
        WHERE neighbor <> target
        RETURN neighbor.name AS name, count(trait) AS matching_nodes_score
        ORDER BY matching_nodes_score DESC
        LIMIT 3
        """
        async with self.driver.session() as session:
            result = await session.run(cast(LiteralString, query), country_name=country_name.title())
            records = await result.data()
            return records

    # =======================================================
    # NEW METHODS FOR HISTORY & TRAVELLED FRONTEND TRACKING
    # =======================================================
    # AI BRIEFING CACHING & ARCHIVE
    # =======================================================
    async def get_cached_briefing(self, user_id: str, country_name: str, purpose: str) -> str | None:
        """Checks the GLOBAL cache for any existing briefing, regardless of who made it."""
        # Note the empty `()` node -> searches the whole graph!
        query = """
        MATCH ()-[r:GENERATED_BRIEFING {purpose: $purpose}]->(c:Country {name: $country_name})
        RETURN r.content AS content LIMIT 1
        """
        async with self.driver.session() as session:
            result = await session.run(cast(LiteralString, query), country_name=country_name.title(), purpose=purpose)
            record = await result.single()
            if record:
                return record["content"]
            return None

    async def save_briefing(self, user_id: str, country_name: str, purpose: str, content: str):
        """Saves a newly generated AI briefing. Guests save anonymously to protect privacy."""
        
        safe_user_id = "global_cache_system" if user_id == "guest_user" else user_id
        
        query = """
        MERGE (u:User {id: $user_id})
        MERGE (c:Country {name: $country_name})
        MERGE (u)-[r:GENERATED_BRIEFING {purpose: $purpose}]->(c)
        ON CREATE SET r.content = $content, r.timestamp = timestamp()
        ON MATCH SET r.content = $content, r.timestamp = timestamp()
        """
        async with self.driver.session() as session:
            await session.run(
                cast(LiteralString, query), 
                user_id=safe_user_id, 
                country_name=country_name.title(), 
                purpose=purpose,
                content=content
            )

    async def get_user_briefing_history(self, user_id: str) -> List[Dict[str, Any]]:
        """Retrieves a list of all briefings the user has successfully generated."""
        query = """
        MATCH (u:User {id: $user_id})-[r:GENERATED_BRIEFING]->(c:Country)
        RETURN c.name AS country, r.purpose AS purpose, r.timestamp AS timestamp
        ORDER BY r.timestamp DESC LIMIT 15
        """
        async with self.driver.session() as session:
            result = await session.run(cast(LiteralString, query), user_id=user_id)
            return await result.data()
        
    async def get_user_search_history(self, user_id: str) -> List[Dict[str, Any]]:
        """Retrieves the most recent countries searched by the user."""
        query = """
        MATCH (u:User {id: $user_id})-[r:SEARCHED]->(c:Country)
        RETURN c.name AS country, r.purpose AS purpose, r.timestamp AS timestamp
        ORDER BY r.timestamp DESC LIMIT 10
        """
        async with self.driver.session() as session:
            result = await session.run(cast(LiteralString, query), user_id=user_id)
            records = await result.data()
            return records

    async def get_travelled_countries(self, user_id: str) -> List[Dict[str, Any]]:
        """Retrieves countries marked as travelled by the user."""
        query = """
        MATCH (u:User {id: $user_id})-[r:VISITED]->(c:Country)
        RETURN c.name AS country, r.timestamp AS timestamp
        ORDER BY r.timestamp DESC
        """
        async with self.driver.session() as session:
            result = await session.run(cast(LiteralString, query), user_id=user_id)
            records = await result.data()
            return records
    

    # =======================================================
    # AUTHENTICATION & USER PROFILES
    # =======================================================
    async def create_user(self, user_id: str, data: dict):
        query = """
        MERGE (u:User {email: $email})
        ON CREATE SET 
            u.id = $id, u.name = $name, u.password_hash = $password_hash,
            u.role = $role, u.age = $age, u.country = $country,
            u.origin_city = $origin_city, u.nationality = $nationality,
            u.citizenship = $citizenship, u.health_condition = $health_condition,
            u.passport_expiry = $passport_expiry, u.passport_blank_pages = $passport_blank_pages,
            u.created_at = timestamp()
        RETURN u
        """
        async with self.driver.session() as session:
            result = await session.run(cast(LiteralString, query), **data)
            record = await result.single()
            if not record:
                raise ValueError("User already exists")
            return record["u"]

    async def get_user_by_email(self, email: str):
        query = "MATCH (u:User {email: $email}) RETURN u.id AS id, u.password_hash AS password_hash, u.name AS name, u.email AS email"
        async with self.driver.session() as session:
            result = await session.run(cast(LiteralString, query), email=email)
            record = await result.single()
            # FIX: Safely cast to dictionary to prevent KeyError on older accounts
            return dict(record) if record else None

    async def get_user_profile(self, user_id: str) -> dict:
        """Fetches the complete user profile including new detailed fields."""
        query = """
        MATCH (u:User {id: $user_id})
        RETURN u.name AS name, u.email AS email, u.origin_city AS origin_city, 
               u.citizenship AS citizenship, u.age AS age, u.role AS role,
               u.health_condition AS health_condition, u.country AS country,
               u.nationality AS nationality, u.passport_expiry AS passport_expiry,
               u.passport_blank_pages AS passport_blank_pages
        """
        async with self.driver.session() as session:
            result = await session.run(cast(LiteralString, query), user_id=user_id)
            record = await result.single()
            return dict(record) if record else {}
    
    async def save_user_journey(self, user_id: str, country_name: str, plan_data: dict):
        import json
        query = """
        MATCH (u:User {id: $user_id})
        MATCH (c:Country {name: $country_name})
        MERGE (u)-[r:TRAVELLED_TO]->(c)
        SET r.plan = $plan_data, r.date = timestamp()
        RETURN r
        """
        async with self.driver.session() as session:
            await session.run(cast(LiteralString, query), user_id=user_id, country_name=country_name, plan_data=json.dumps(plan_data))

    # NEW: Fetch all archived journeys for a user
    async def get_user_journeys(self, user_id: str) -> list:
        import json
        query = """
        MATCH (u:User {id: $user_id})-[r:TRAVELLED_TO]->(c:Country)
        RETURN c.name AS country, r.plan AS plan, r.date AS date
        ORDER BY r.date DESC
        """
        async with self.driver.session() as session:
            result = await session.run(cast(LiteralString, query), user_id=user_id)
            records = await result.data()
            
            journeys = []
            for rec in records:
                plan_data = rec["plan"]
                if isinstance(plan_data, str):
                    try:
                        plan_data = json.loads(plan_data)
                    except:
                        plan_data = {}
                journeys.append({
                    "country": rec["country"],
                    "plan": plan_data,
                    "timestamp": rec["date"]
                })
            return journeys
    
    async def get_user_by_id(self, user_id: str):
        """Fetches a user directly by their ID for password verification."""
        query = "MATCH (u:User {id: $user_id}) RETURN u.id AS id, u.password_hash AS password_hash"
        async with self.driver.session() as session:
            result = await session.run(cast(LiteralString, query), user_id=user_id)
            record = await result.single()
            return dict(record) if record else None

    async def update_user_profile(self, user_id: str, data: dict):
        """Updates only the fields provided in the user's profile."""
        
        set_clauses = ", ".join([f"u.{k} = ${k}" for k in data.keys() if data[k] is not None])
        if not set_clauses: return
        
        query = f"""
        MATCH (u:User {{id: $user_id}})
        SET {set_clauses}
        RETURN u
        """
        async with self.driver.session() as session:
            await session.run(cast(LiteralString, query), user_id=user_id, **data)    
    
    async def get_all_global_briefings(self) -> List[Dict[str, Any]]:
        """DEV ROUTE: Fetches all generated briefings globally to verify the cache."""
        query = """
        MATCH ()-[r:GENERATED_BRIEFING]->(c:Country)
        RETURN DISTINCT c.name AS country, r.purpose AS purpose, r.timestamp AS timestamp
        ORDER BY r.timestamp DESC LIMIT 50
        """
        async with self.driver.session() as session:
            result = await session.run(cast(LiteralString, query))
            return await result.data()

# Initialize single global instance
graph_db = Neo4jGraphService()