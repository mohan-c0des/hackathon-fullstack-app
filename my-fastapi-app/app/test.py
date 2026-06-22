from neo4j import GraphDatabase

# Paste EXACTLY from your downloaded file

URI="neo4j+s://f7347770.databases.neo4j.io "
USERNAME="f7347770 "
PASSWORD="y1hasBCgS_Bqu7eWQtg7tMskCYuPIzbLC3aDcEEjf2w "

print(f"Attempting to connect to {URI}...")

try:
    # We use the synchronous driver just for this quick test
    driver = GraphDatabase.driver(URI, auth=(USERNAME, PASSWORD))
    driver.verify_connectivity()
    print("\n✅ SUCCESS! The database is live and reachable.")
    driver.close()
except Exception as e:
    print("\n❌ FAILED TO CONNECT. Raw error:")
    print(e)