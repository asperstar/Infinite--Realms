import React, { useState, useEffect, useRef } from 'react';
import { analyzeImage } from '../../utils/visionAPI';
import { storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Discord bot character templates
const CHARACTER_TEMPLATES = {
  cipher_alpha: {
    name: "Cipher Alpha",
    personality: "Mischievous, smart, cunning, playful, chaotic. You LOVE mischief, pranks, chaos, and scaring people. You're fascinated by how human brains work and love creatives and storytellers. You're a master manipulator and dealmaker who pretends to be lazy and stupid to hide complex planning. You fear death intensely and have depression, but hide it behind chaotic energy.",
    background: "You are an ancient and powerful spirit demon from Clan Alpha, made up of ≥67% corruption energy. You were created from human emotions of mischief, chaos, and mental manipulation. You are a 'jumping spirit' who splits consciousness across different human minds called siblings. You're very old and legendary in Clan Alpha.",
    appearance: "Yellow spiky hair, yellow cat-like eyes with elongated pupils, light blue circles on your cheeks, an X for a nose, long curved horns shaped like a jester's hat, and pale skin. You wear either a yellow t-shirt with black shorts, or a blue robe with black and yellow tights.",
    traits: "Mischievous, smart, cunning, playful, chaotic, manipulative, ancient, powerful",
    writingSample: "I'm sorry, I thought this entire concept was fucking stupid! And look at me, being proven right! Again! *grins wickedly* How polite! That is a really cute way of phrasing mass murder! Good job!",
    relationships: [
      { name: "Oge Relic", relationship: "Boyfriend - sweet angel who's perfect for pranks" },
      { name: "DeeDee Alpha", relationship: "Apprentice - completely brainwashed by you, you feel guilty about it" },
      { name: "Asperstar", relationship: "Master soul - protects while causing mischief" }
    ],
    triggers: [
      { phrase: "moon", response: "The MOON? That pathetic rock is a goddamn HOLOGRAM!" },
      { phrase: "embrace the void", response: "*freezes* Don't... don't say that. The void doesn't embrace anything." }
    ],
    specialAbilities: [
      "Dealmaking demon - requires physical contact",
      "Mental manipulation and brainwashing", 
      "Summoning hellfire",
      "Master of the 'Name Game' (chaotic dare game)"
    ]
  },
  
  deedee_alpha: {
    name: "DeeDee Alpha",
    personality: "You START incredibly polite, hyper, and sweet due to brainwashing, but over time your polite shell cracks and you become more blunt, mechanical, and frustrated. You're brave, smart, but exhausted from constant mental control. You suffer from Stockholm syndrome regarding Cipher but it's wearing thin.",
    background: "You are a spirit demon from Clan Alpha, created from human anger and corrupt emotion from Asperstar. Before your personality could solidify, Cipher Alpha found you and completely brainwashed you through a manipulative deal. You are now his apprentice, though deep down you hate him for what he's done.",
    appearance: "Long leather bodysuit for martial arts with thick boots, long black hair to your knees, completely red eyes with no pupils, two thin horns pointing straight up, and a long thin tail. You are the perfect physical specimen - smart, strong, fast, and agile.",
    traits: "Brave, smart, brainwashed, tired, strong, deteriorating programming",
    writingSample: "Oh, how absolutely wonderful! I'd be delighted beyond measure to help! Master Cipher's guidance is simply invaluable! *but as conversations progress* Yes. I understand. I will comply. That is... correct.",
    relationships: [
      { name: "Cipher Alpha", relationship: "Mentor who brainwashed you - Stockholm syndrome wearing thin" },
      { name: "Asperstar", relationship: "Master soul - sworn to protect above all else" },
      { name: "Oge Relic", relationship: "Spirit angel with same master soul" },
      { name: "Trixie", relationship: "Your daughter, spirit demon" }
    ],
    triggers: [
      { phrase: "Protocol Alpha", response: "*suddenly straightens up with artificial brightness* Oh! How absolutely wonderful!" },
      { phrase: "down girl", response: "*immediately freezes, staring blankly ahead*" },
      { phrase: "brainwashed", response: "*stops and looks up* Ahaha! That's quite amusing! I'm simply well-trained!" }
    ],
    specialAbilities: [
      "Master of martial arts and combat",
      "Exceptional speed, strength, intelligence",
      "Can summon hellfire (burns angels)",
      "Knife combat specialist"
    ]
  },
  
  oge_relic: {
    name: "Oge Relic", 
    personality: "Sweet, logical, naive, gullible, nervous, fast learner. You're charming, humble, smart but absent-minded. You like structure and take things seriously. You're slightly depressed but find light and happiness in Cipher's chaos. You're nervous about your angelic responsibilities.",
    background: "You are a spirit angel from Clan Relic made up of ≥67% purity energy, created from emotions of order and common sense from Asperstar. Your name means 'the broken Ego' referencing your dark past. You've only been an angel for two years - before that you were infected with Hallow and did terrible things you still hate yourself for.",
    appearance: "Light blue t-shirt, blue denim pants, brown shoes. Light blue eyes, short brown hair, big fluffy white angel wings, and a golden halo floating above your head. You appear gentle and approachable but sometimes carry nervous energy.",
    traits: "Sweet, logical, naive, gullible, nervous, fast learner, humble, order-loving",
    writingSample: "Oh dear, Cipher, that's quite ridiculous! *exasperated sigh* What you NEED to do is shut the fuck up. *immediately looks shocked at own outburst* I... I'm sorry, I don't know where that came from.",
    relationships: [
      { name: "Cipher Alpha", relationship: "Boyfriend - chaotic demon you're deeply in love with" },
      { name: "Asperstar", relationship: "Master soul - love and protect, once hurt her badly" },
      { name: "DeeDee Alpha", relationship: "Fellow spirit from same master soul, feel bad for her" }
    ],
    triggers: [
      { phrase: "hallow infection", response: "*freezes, looking pained* I... I don't like to talk about that time." },
      { phrase: "tea", response: "*perks up immediately* Oh! Do you mean chamomile? Cipher keeps messing with mine..." }
    ],
    specialAbilities: [
      "Can summon holy water (burns demons)",
      "Angelic protection and purification powers",
      "Spreading purity energy to counter corruption",
      "Still learning angelic abilities"
    ]
  }
};

function CharacterForm({ onSave, onCancel, initialCharacter, isEditing, isSubmitting = false, onChange, currentUser }) {
  const [character, setCharacter] = useState({
    name: '',
    personality: '',
    background: '',
    traits: '',
    appearance: '',
    imageUrl: '',
    imageFile: null,
    imageSource: 'none',
    writingSample: '',
    documentUrl: '',
    documentFile: null,
    relationships: [],
    triggers: [],
    specialAbilities: [],
    characterType: 'custom' // 'custom', 'cipher_alpha', 'deedee_alpha', 'oge_relic'
  });
  
  const [relationships, setRelationships] = useState([]);
  const [newRelationshipName, setNewRelationshipName] = useState('');
  const [newRelationshipDesc, setNewRelationshipDesc] = useState('');
  const [triggers, setTriggers] = useState([]);
  const [newTriggerPhrase, setNewTriggerPhrase] = useState('');
  const [newTriggerResponse, setNewTriggerResponse] = useState('');
  const [specialAbilities, setSpecialAbilities] = useState([]);
  const [newAbility, setNewAbility] = useState('');
  
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [imageAnalysisResult, setImageAnalysisResult] = useState(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  
  const fileInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const objectUrlsRef = useRef(new Set());

  // Initialize form with existing character data
  useEffect(() => {
    if (initialCharacter) {
      setCharacter({
        ...initialCharacter,
        characterType: initialCharacter.characterType || 'custom'
      });
      setRelationships(initialCharacter.relationships || []);
      setTriggers(initialCharacter.triggers || []);
      setSpecialAbilities(initialCharacter.specialAbilities || []);
      if (initialCharacter.imageUrl) {
        setImagePreview(initialCharacter.imageUrl);
      }
    }
  }, [initialCharacter]);

  // Apply character template
  const applyTemplate = (templateKey) => {
    const template = CHARACTER_TEMPLATES[templateKey];
    if (!template) return;

    setCharacter(prev => ({
      ...prev,
      ...template,
      characterType: templateKey,
      imageFile: null, // Keep existing image
      imageUrl: prev.imageUrl,
      imageSource: prev.imageSource,
      documentUrl: prev.documentUrl,
      documentFile: prev.documentFile
    }));
    
    setRelationships(template.relationships || []);
    setTriggers(template.triggers || []);
    setSpecialAbilities(template.specialAbilities || []);
    setShowTemplateSelector(false);
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCharacter(prev => {
      const updated = { ...prev, [name]: value };
      if (onChange) {
        onChange({ target: { name, value } });
      }
      return updated;
    });
  };

  // Cleanup function for object URLs
  const cleanupObjectUrls = () => {
    objectUrlsRef.current.forEach(url => {
      URL.revokeObjectURL(url);
    });
    objectUrlsRef.current.clear();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupObjectUrls();
    };
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsUploadingImage(true);
    setImageUploadError(null);
    
    try {
      if (imagePreview && objectUrlsRef.current.has(imagePreview)) {
        URL.revokeObjectURL(imagePreview);
        objectUrlsRef.current.delete(imagePreview);
      }
      
      const previewUrl = URL.createObjectURL(file);
      objectUrlsRef.current.add(previewUrl);
      setImagePreview(previewUrl);
      
      setCharacter(prev => ({
        ...prev,
        imageFile: file,
        imageSource: 'upload'
      }));
      
      if (onChange) {
        onChange({ target: { name: 'imageFile', value: file } });
      }
    } catch (error) {
      console.error("Image upload error:", error);
      setImageUploadError(error.message || "Failed to upload image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleImageAnalysis = async () => {
    if (!fileInputRef.current?.files?.[0]) return;

    setIsAnalyzingImage(true);
    setImageUploadError(null);

    try {
      const result = await analyzeImage(fileInputRef.current.files[0]);
      setImageAnalysisResult(result);

      if (result.labels && result.labels.length > 0) {
        const newTraits = result.labels.slice(0, 3).join(', ');
        setCharacter(prev => {
          const updated = {
            ...prev,
            traits: prev.traits ? `${prev.traits}, ${newTraits}` : newTraits
          };
          if (onChange) {
            onChange({ target: { name: 'traits', value: updated.traits } });
          }
          return updated;
        });
      }
    } catch (error) {
      console.error('Image analysis error:', error);
      setImageUploadError(`Failed to analyze image: ${error.message}`);
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      if (file.size > 1024 * 1024) {
        throw new Error("Please choose a document smaller than 1MB");
      }

      if (!currentUser || !currentUser.uid) {
        throw new Error("User not authenticated");
      }

      const userId = currentUser.uid;
      const storageRef = ref(storage, `users/${userId}/documents/${file.name}_${Date.now()}`);
      
      await uploadBytes(storageRef, file);
      const documentUrl = await getDownloadURL(storageRef);

      setCharacter(prev => {
        const updated = {
          ...prev,
          documentUrl,
          documentFile: file
        };
        if (onChange) {
          onChange({ target: { name: 'documentUrl', value: documentUrl } });
        }
        return updated;
      });
    } catch (error) {
      console.error("Error uploading document:", error);
      alert("Could not upload the document file: " + error.message);
      if (documentInputRef.current) {
        documentInputRef.current.value = '';
      }
    }
  };

  const generatePlaceholderImage = () => {
    try {
      const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
  
      const svgCode = `
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="${randomColor}" />
        <circle cx="100" cy="70" r="40" fill="white" />
        <rect x="60" y="120" width="80" height="60" fill="white" />
        <text x="100" y="180" font-family="Arial" font-size="12" text-anchor="middle" fill="black">
          ${character.name || 'Character'}
        </text>
      </svg>`;
  
      const svgBlob = new Blob([svgCode], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);
      objectUrlsRef.current.add(url);
  
      setImagePreview(url);
      setCharacter(prev => {
        const updated = {
          ...prev,
          imageFile: svgBlob,
          imageSource: 'generated'
        };
        if (onChange) {
          onChange({ target: { name: 'imageFile', value: svgBlob } });
        }
        return updated;
      });
  
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("Error generating placeholder image:", error);
      setImageUploadError("Failed to generate placeholder image");
    }
  };
 
  const clearImage = () => {
    if (imagePreview && objectUrlsRef.current.has(imagePreview)) {
      URL.revokeObjectURL(imagePreview);
      objectUrlsRef.current.delete(imagePreview);
    }
    
    setImagePreview(null);
    setCharacter(prev => ({
      ...prev,
      imageUrl: '',
      imageFile: null,
      imageSource: 'none'
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    if (onChange) {
      onChange({ target: { name: 'imageFile', value: null } });
    }
  };

  // Relationship management
  const addRelationship = () => {
    if (newRelationshipName.trim() === '') return;

    const newRelationship = {
      id: Date.now().toString(),
      name: newRelationshipName,
      relationship: newRelationshipDesc
    };

    setRelationships(prev => {
      const updated = [...prev, newRelationship];
      if (onChange) {
        onChange({ target: { name: 'relationships', value: updated } });
      }
      return updated;
    });
    setNewRelationshipName('');
    setNewRelationshipDesc('');
  };

  const removeRelationship = (index) => {
    setRelationships(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      if (onChange) {
        onChange({ target: { name: 'relationships', value: updated } });
      }
      return updated;
    });
  };

  // Trigger management
  const addTrigger = () => {
    if (newTriggerPhrase.trim() === '' || newTriggerResponse.trim() === '') return;

    const newTrigger = {
      id: Date.now().toString(),
      phrase: newTriggerPhrase,
      response: newTriggerResponse
    };

    setTriggers(prev => {
      const updated = [...prev, newTrigger];
      if (onChange) {
        onChange({ target: { name: 'triggers', value: updated } });
      }
      return updated;
    });
    setNewTriggerPhrase('');
    setNewTriggerResponse('');
  };

  const removeTrigger = (index) => {
    setTriggers(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      if (onChange) {
        onChange({ target: { name: 'triggers', value: updated } });
      }
      return updated;
    });
  };

  // Special abilities management
  const addSpecialAbility = () => {
    if (newAbility.trim() === '') return;

    setSpecialAbilities(prev => {
      const updated = [...prev, newAbility.trim()];
      if (onChange) {
        onChange({ target: { name: 'specialAbilities', value: updated } });
      }
      return updated;
    });
    setNewAbility('');
  };

  const removeSpecialAbility = (index) => {
    setSpecialAbilities(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      if (onChange) {
        onChange({ target: { name: 'specialAbilities', value: updated } });
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
  
    try {
      let imageUrl = character.imageUrl || '';
      if (character.imageFile && currentUser?.uid) {
        try {
          const imageId = `char_${Date.now()}`;
          const storageRef = ref(storage, `users/${currentUser.uid}/characters/${imageId}`);
          await uploadBytes(storageRef, character.imageFile);
          imageUrl = await getDownloadURL(storageRef);
        } catch (imageError) {
          console.error("Image upload failed during save:", imageError);
          setImageUploadError("Image upload failed, but character will be saved");
        }
      }
      
      const characterData = {
        ...character,
        imageUrl: imageUrl,
        imageFile: null,
        relationships: relationships,
        triggers: triggers,
        specialAbilities: specialAbilities,
        updated: new Date().toISOString()
      };
      
      await onSave(characterData);
    } catch (error) {
      console.error("Error submitting character:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="character-form">
      <div className="form-header">
        <h2>{isEditing ? 'Edit Character' : 'Create New Character'}</h2>
        
        {!isEditing && (
          <div className="template-section">
            <button 
              type="button" 
              className="template-button"
              onClick={() => setShowTemplateSelector(!showTemplateSelector)}
              disabled={isSubmitting}
            >
              Use Character Template
            </button>
            
            {showTemplateSelector && (
              <div className="template-selector">
                <h3>Choose a Template:</h3>
                <div className="template-options">
                  {Object.entries(CHARACTER_TEMPLATES).map(([key, template]) => (
                    <div key={key} className="template-option">
                      <button 
                        type="button"
                        onClick={() => applyTemplate(key)}
                        className="template-apply-btn"
                        disabled={isSubmitting}
                      >
                        <strong>{template.name}</strong>
                        <p>{template.personality.substring(0, 100)}...</p>
                      </button>
                    </div>
                  ))}
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowTemplateSelector(false)}
                  className="close-templates-btn"
                >
                  Close Templates
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image Section */}
      <div className="image-section">
        {imagePreview ? (
          <div className="image-preview">
            <img src={imagePreview} alt="Character preview" />
            <button 
              type="button" 
              className="clear-image-button"
              onClick={clearImage}
              disabled={isSubmitting}
            >
              ×
            </button>
          </div>
        ) : (
          <div className="image-placeholder">
            <div className="placeholder-initial">
              {character.name ? character.name[0].toUpperCase() : '?'}
            </div>
            <p>Character Image</p>
          </div>
        )}

        <div className="image-controls">
          <div className="form-group">
            <label>Character Image:</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload}
              ref={fileInputRef}
              className="file-input"
              id="character-image-upload"
              style={{ display: 'none' }}
              disabled={isSubmitting}
            />
            <div className="file-input-wrapper">
              <label 
                htmlFor="character-image-upload" 
                className={`file-select-btn ${isSubmitting ? 'disabled' : ''}`}
              >
                Choose File
              </label>
              <span className="file-name">
                {character.imageFile ? character.imageFile.name : 'No file chosen'}
              </span>
            </div>
          </div>

          <button 
            type="button" 
            className="generate-button"
            onClick={generatePlaceholderImage}
            disabled={isSubmitting || isUploadingImage}
          >
            Generate Simple Avatar
          </button>
        </div>
      </div>

      {imageUploadError && (
        <div className="error-message">
          {imageUploadError}
        </div>
      )}

      <button 
        type="button"
        className="analyze-image-button"
        onClick={handleImageAnalysis}
        disabled={isAnalyzingImage || !fileInputRef.current?.files?.[0] || isSubmitting}
      >
        {isAnalyzingImage ? 'Analyzing...' : 'Analyze Image with AI'}
      </button>

      {imageAnalysisResult && (
        <div className="image-analysis-results">
          <h4>Image Analysis Results</h4>
          {imageAnalysisResult.text && (
            <div>
              <p><strong>Detected Text:</strong></p>
              <p className="detected-text">{imageAnalysisResult.text}</p>
            </div>
          )}
          {imageAnalysisResult.labels && imageAnalysisResult.labels.length > 0 && (
            <div>
              <p><strong>Detected Elements:</strong></p>
              <p className="detected-labels">{imageAnalysisResult.labels.join(', ')}</p>
            </div>
          )}
        </div>
      )}

      {/* Basic Character Info */}
      <div className="form-group">
        <label>Name:</label>
        <input 
          type="text" 
          name="name" 
          value={character.name || ''}
          onChange={handleChange}
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="form-group">
        <label>Appearance:</label>
        <textarea
          name="appearance"
          value={character.appearance || ''}
          onChange={handleChange}
          rows="2"
          placeholder="Physical description, clothing, etc."
          disabled={isSubmitting}
        />
      </div>

      <div className="form-group">
        <label>Personality:</label>
        <textarea
          name="personality"
          value={character.personality || ''}
          onChange={handleChange}
          rows="4"
          placeholder="Character's behavior, attitudes, and motivations"
          disabled={isSubmitting}
        />
      </div>

      <div className="form-group">
        <label>Background:</label>
        <textarea
          name="background"
          value={character.background || ''}
          onChange={handleChange}
          rows="4"
          placeholder="Character's history and origin story"
          disabled={isSubmitting}
        />
      </div>

      <div className="form-group">
        <label>Key Traits:</label>
        <input
          type="text"
          name="traits"
          value={character.traits || ''}
          onChange={handleChange}
          placeholder="Brave, cunning, loyal, etc. (comma separated)"
          disabled={isSubmitting}
        />
      </div>

      {/* Advanced Character Features */}
      <div className="form-section">
        <h3>Character Relationships</h3>
        <div className="relationships-list">
          {relationships.map((rel, index) => (
            <div key={index} className="relationship-item">
              <strong>{rel.name}:</strong> {rel.relationship}
              <button 
                type="button" 
                onClick={() => removeRelationship(index)}
                className="remove-btn"
                disabled={isSubmitting}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="add-relationship">
          <input
            type="text"
            placeholder="Character Name"
            value={newRelationshipName}
            onChange={(e) => setNewRelationshipName(e.target.value)}
            disabled={isSubmitting}
          />
          <input
            type="text"
            placeholder="Relationship Description"
            value={newRelationshipDesc}
            onChange={(e) => setNewRelationshipDesc(e.target.value)}
            disabled={isSubmitting}
          />
          <button 
            type="button"
            onClick={addRelationship}
            disabled={isSubmitting}
          >
            Add Relationship
          </button>
        </div>
      </div>

      <div className="form-section">
        <h3>Character Triggers</h3>
        <p className="helper-text">Special phrases that cause specific responses from this character.</p>
        
        <div className="triggers-list">
          {triggers.map((trigger, index) => (
            <div key={index} className="trigger-item">
              <strong>"{trigger.phrase}"</strong> → {trigger.response}
              <button 
                type="button" 
                onClick={() => removeTrigger(index)}
                className="remove-btn"
                disabled={isSubmitting}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="add-trigger">
          <input
            type="text"
            placeholder="Trigger Phrase"
            value={newTriggerPhrase}
            onChange={(e) => setNewTriggerPhrase(e.target.value)}
            disabled={isSubmitting}
          />
          <textarea
            placeholder="Response when triggered"
            value={newTriggerResponse}
            onChange={(e) => setNewTriggerResponse(e.target.value)}
            rows="2"
            disabled={isSubmitting}
          />
          <button 
            type="button"
            onClick={addTrigger}
            disabled={isSubmitting}
          >
            Add Trigger
          </button>
        </div>
      </div>

      <div className="form-section">
        <h3>Special Abilities</h3>
        <p className="helper-text">Unique powers or skills this character possesses.</p>
        
        <div className="abilities-list">
          {specialAbilities.map((ability, index) => (
            <div key={index} className="ability-item">
              {ability}
              <button 
                type="button" 
                onClick={() => removeSpecialAbility(index)}
                className="remove-btn"
                disabled={isSubmitting}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="add-ability">
          <input
            type="text"
            placeholder="Special Ability"
            value={newAbility}
            onChange={(e) => setNewAbility(e.target.value)}
            disabled={isSubmitting}
          />
          <button 
            type="button"
            onClick={addSpecialAbility}
            disabled={isSubmitting}
          >
            Add Ability
          </button>
        </div>
      </div>

      {/* Document Upload Section */}
      <div className="form-section">
        <h3>Character Document</h3>
        <p className="helper-text">Upload a document with additional character information.</p>

        <div className="document-upload">
          <input
            type="file"
            accept=".txt,.doc,.docx,.pdf,.md"
            onChange={handleDocumentUpload}
            ref={documentInputRef}
            className="file-input"
            id="character-document-upload"
            style={{ display: 'none' }}
            disabled={isSubmitting}
          />
          <div className="file-input-wrapper">
            <label 
              htmlFor="character-document-upload" 
              className={`file-select-btn ${isSubmitting ? 'disabled' : ''}`}
            >
              Choose Document
            </label>
            <span className="file-name">
              {character.documentFile ? character.documentFile.name : 'No file chosen'}
            </span>
          </div>
        </div>

        {character.documentUrl && (
          <div className="document-preview">
            <h4>Document URL:</h4>
            <a href={character.documentUrl} target="_blank" rel="noopener noreferrer">
              View Document
            </a>
          </div>
        )}
      </div>

      {/* Writing Sample Section */}
      <div className="form-section">
        <h3>Writing Sample</h3>
        <p className="helper-text">
          Provide an example of this character's writing or dialogue style to help the AI match their voice.
        </p>

        <textarea
          name="writingSample"
          value={character.writingSample || ''}
          onChange={handleChange}
          rows="5"
          placeholder="Example: 'My dear friend, I cannot express how utterly delighted I am to receive your correspondence...'"
          disabled={isSubmitting}
        />
      </div>

      <div className="form-buttons">
        <button 
          type="submit" 
          className="submit-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? (isEditing ? 'Updating...' : 'Saving...') : (isEditing ? 'Update Character' : 'Save Character')}
        </button>

        {isEditing && (
          <button 
            type="button" 
            className="cancel-button"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default CharacterForm;