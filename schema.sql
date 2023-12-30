DROP TABLE IF EXISTS Mealdb;
CREATE TABLE IF NOT EXISTS Mealdb (
    MealId INTEGER PRIMARY KEY AUTOINCREMENT, 
    NAME VARCHAR(50),
    Location VARCHAR(15),
    Mealtype VARCHAR(15),    
    Feel     VARCHAR(25),
    Price    INTEGER,
    Rating   FLOAT,
    Address  VARCHAR(50),
    REVIEW_CONTENT  TEXT,
    Lat       Decimal(8,6),
    Lng       Decimal(9,6),
    ADMIN_OK BOOLEAN
);