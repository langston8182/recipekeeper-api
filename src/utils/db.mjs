import mongoose from 'mongoose';
import {getConfigValue} from "./config.appconfig.mjs";

const ENV = process.env.ENVIRONMENT || "preprod";
const DB_NAME = process.env.DB_NAME;

// Simple in-memory cache for the Lambda runtime
const cache = {
    uri: null,
    uriPromise: null,
    dbName: null,
    dbNamePromise: null,
    isConnected: false
};

async function getUri() {
    if (cache.uri) return cache.uri;
    if (!cache.uriPromise) {
        cache.uriPromise = (async () => {
            const keyMongo = `${ENV}.MONGO_URI`;
            let u = await getConfigValue("mongodb", keyMongo);
            if (!u) throw new Error(`Missing MongoDB URI in AppConfig profile 'mongodb' for env '${ENV}' (keys tried: ${keyMongo})`);
            return u;
        })();
    }
    cache.uri = await cache.uriPromise;
    return cache.uri;
}

async function getDbName() {
    if (cache.dbName) return cache.dbName;
    if (!cache.dbNamePromise) {
        cache.dbNamePromise = (async () => {
            // 1. priorité à la variable d’env DB_NAME
            if (process.env.DB_NAME) return process.env.DB_NAME;

            // 2. sinon, on va chercher dans AppConfig
            const keyName = `${ENV}.DB_NAME`;
            let name = await getConfigValue("mongodb", keyName);
            if (!name) throw new Error(`Missing DB_NAME in AppConfig profile 'mongodb' for env '${ENV}' (key tried: ${keyName})`);
            return name;
        })();
    }
    cache.dbName = await cache.dbNamePromise;
    return cache.dbName;
}

export async function getDb() {
    if (cache.isConnected && mongoose.connection.readyState === 1) {
        return mongoose.connection.db;
    }
    
    const uri = await getUri();
    const dbName = await getDbName();
    
    console.log('Connecting to DB:', uri);
    
    // Configuration Mongoose pour MongoDB Atlas
    await mongoose.connect(uri, {
        dbName: dbName,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxPoolSize: 5
    });
    
    cache.isConnected = true;
    console.log("Connected DB:", dbName);
    return mongoose.connection.db;
}

export async function getClient() {
    if (cache.isConnected && mongoose.connection.readyState === 1) {
        return mongoose.connection.getClient();
    }
    await getDb();
    return mongoose.connection.getClient();
}

export async function closeDb() {
    if (cache.isConnected) {
        await mongoose.disconnect();
        cache.isConnected = false;
        cache.uri = null;
        cache.uriPromise = null;
        cache.dbName = null;
        cache.dbNamePromise = null;
    }
}