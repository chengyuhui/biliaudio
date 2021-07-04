import sqlite3

conn = sqlite3.connect("data/db.sqlite")

# Init
conn.execute("CREATE TABLE IF NOT EXISTS videos (bvid TEXT PRIMARY KEY)")
conn.commit()


def query_record(bvid):
    cur = conn.cursor()
    for row in cur.execute("SELECT * FROM videos WHERE bvid = ?", (bvid,)):
        return True
    return False


def add_record(bvid):
    conn.execute("INSERT INTO videos VALUES (?)", (bvid,))
    conn.commit()
