#!/bin/bash
wrangler d1 migrations list mealdb --local 
# wrangler d1 migrations create mealdb mealdbmigrate 
# wrangler d1 migrations create mealdb mealdbmigrate
wrangler d1 migrations apply mealdb