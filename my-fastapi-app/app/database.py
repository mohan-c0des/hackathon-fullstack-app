import os
import datetime
from typing import List, Dict, Any, cast, LiteralString, Optional
from neo4j import AsyncGraphDatabase

class Neo4jGraphService:
    def __init__(self):
        uri = os.getenv("NEO4J_URI")
        username = os.getenv("NEO4J_USERNAME")
        password = os.getenv("NEO4J_PASSWORD")

        if not uri or not username or not password:
            raise RuntimeError("Missing Neo4j connection environment variables.")
            
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
        """
        
        async with self.driver.session() as session:
            for query in constraints:
                await session.run(cast(LiteralString, query))
            await session.run(cast(LiteralString, seed_data_query))

    async def log_user_search(self, user_id: str, country_name: str, purpose: str):
        # 🛡️ PRIVACY SHIELD: Do not track guest users AT ALL.
        if user_id == "guest_user":
            return 
            
        query = """
        MERGE (u:User {id: $user_id})
        ON CREATE SET u.created_at = timestamp()
        MATCH (c:Country {name: $country_name})
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
        # 🛡️ PRIVACY SHIELD: Guests save to a faceless system node to save API limits.
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
    # ... paste these inside the Neo4jGraphService class in app/database.py ...

    # =======================================================
    # JOURNEY TRACKER & BOOMER MEMORY
    # =======================================================
    async def init_or_get_journey(self, user_id: str, target_country: str, profile_data: Optional[dict] = None) -> dict:
        """Initializes a new journey or fetches an ongoing one."""
        query = """
        MERGE (u:User {id: $user_id})
        MERGE (c:Country {name: $target_country})
        MERGE (u)-[j:HAS_JOURNEY]->(c)
        ON CREATE SET 
            j.phase = 1,
            j.origin_city = $origin_city,
            j.destination_city = $destination_city,
            j.citizenship = $citizenship,
            j.age = $age,
            j.purpose = $purpose,
            j.created_at = timestamp()
        RETURN properties(j) AS journey_state
        """
        params = {
            "user_id": user_id,
            "target_country": target_country.title(),
            "origin_city": profile_data.get("origin_city", "") if profile_data else "",
            "destination_city": profile_data.get("destination_city", "") if profile_data else "",
            "citizenship": profile_data.get("citizenship", "") if profile_data else "",
            "age": profile_data.get("age", 0) if profile_data else 0,
            "purpose": profile_data.get("purpose", "") if profile_data else ""
        }
        async with self.driver.session() as session:
            result = await session.run(cast(LiteralString, query), **params)
            record = await result.single()
            return record["journey_state"] if record else {}

    async def update_journey_phase(self, user_id: str, target_country: str, new_phase: int):
        """Moves Boomer and the User to the next step of the journey."""
        query = """
        MATCH (u:User {id: $user_id})-[j:HAS_JOURNEY]->(c:Country {name: $target_country})
        SET j.phase = $new_phase
        """
        async with self.driver.session() as session:
            await session.run(cast(LiteralString, query), user_id=user_id, target_country=target_country.title(), new_phase=new_phase)

    async def log_journey_chat(self, user_id: str, target_country: str, sender: str, text: str):
        """Saves Boomer's conversation history."""
        query = """
        MATCH (u:User {id: $user_id})-[j:HAS_JOURNEY]->(c:Country {name: $target_country})
        CREATE (msg:JourneyMessage {
            sender: $sender,
            text: $text,
            timestamp: timestamp()
        })
        CREATE (j)-[:HAS_MESSAGE]->(msg)
        """
        async with self.driver.session() as session:
            await session.run(cast(LiteralString, query), user_id=user_id, target_country=target_country.title(), sender=sender, text=text)

    async def get_journey_history(self, user_id: str, target_country: str) -> List[Dict[str, Any]]:
        """Retrieves past chat messages to feed into Claude's memory."""
        query = """
        MATCH (u:User {id: $user_id})-[j:HAS_JOURNEY]->(c:Country {name: $target_country})-[:HAS_MESSAGE]->(msg:JourneyMessage)
        RETURN msg.sender AS sender, msg.text AS text
        ORDER BY msg.timestamp ASC LIMIT 20
        """
        async with self.driver.session() as session:
            result = await session.run(cast(LiteralString, query), user_id=user_id, target_country=target_country.title())
            return await result.data()

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
    
    async def get_user_by_id(self, user_id: str):
        """Fetches a user directly by their ID for password verification."""
        query = "MATCH (u:User {id: $user_id}) RETURN u.id AS id, u.password_hash AS password_hash"
        async with self.driver.session() as session:
            result = await session.run(cast(LiteralString, query), user_id=user_id)
            record = await result.single()
            return dict(record) if record else None

    async def update_user_profile(self, user_id: str, data: dict):
        """Updates only the fields provided in the user's profile."""
        # Dynamically build the SET clauses so we don't overwrite things with nulls
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