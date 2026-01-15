import mongoose from 'mongoose';

/**
 * Schéma d'un ingrédient
 */
const ingredientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Le nom de l\'ingrédient est requis'],
        trim: true
    },
    quantity: {
        type: Number,
        default: 1
    },
    unit: {
        type: String,
        trim: true,
        lowercase: true
    }
}, { _id: false });

/**
 * Schéma d'une étape de préparation
 */
const stepSchema = new mongoose.Schema({
    order: {
        type: Number,
        required: [true, 'L\'ordre de l\'étape est requis'],
        min: [1, 'L\'ordre doit être supérieur à 0']
    },
    text: {
        type: String,
        required: [true, 'Le texte de l\'étape est requis'],
        trim: true
    }
}, { _id: false });

/**
 * Schéma principal d'une recette
 */
const recipeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Le titre de la recette est requis'],
        trim: true,
        maxlength: [200, 'Le titre ne peut pas dépasser 200 caractères']
    },
    servings: {
        type: Number,
        required: [true, 'Le nombre de portions est requis'],
        min: [1, 'Le nombre de portions doit être au moins 1']
    },
    ingredients: {
        type: [ingredientSchema],
        validate: [
            {
                validator: function(ingredients) {
                    return ingredients && ingredients.length > 0;
                },
                message: 'Au moins un ingrédient est requis'
            }
        ]
    },
    steps: {
        type: [stepSchema],
        validate: [
            {
                validator: function(steps) {
                    return steps && steps.length > 0;
                },
                message: 'Au moins une étape est requise'
            }
        ]
    },
    tags: {
        type: [String],
        default: []
    }
}, {
    timestamps: true, // Active automatiquement createdAt et updatedAt
    collection: 'recipes'
});

/**
 * Méthode pour transformer le document en JSON
 * (utile pour les réponses API)
 */
recipeSchema.set('toJSON', {
    transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
    }
});

const Recipe = mongoose.model('Recipe', recipeSchema);

export default Recipe;
