/**
 * @author codingsamuel
 * @license MIT
 * @version 1.0.3
 * @copyright codingsamuel 2019
 */
if (!Object.entries) {
  Object.entries = function (obj) {
    var ownProps = Object.keys(obj),
      i = ownProps.length,
      resArray = new Array(i); // preallocate the Array
    while (i--)
      resArray[i] = [ownProps[i], obj[ownProps[i]]];

    return resArray;
  };
}

class LwcTranslator {

  /**
   * @param {String} languageSettingsFile 
   * @param {String} languageFolderPath 
   * @param {Object} lwcSettings
   */
  constructor(languageSettingsFile, languageFolderPath, lwcSettings) {
    this._languageSettings = [];
    this._languages = [];
    this._lwcSettings = lwcSettings;
    this.languageSettingsFile = languageSettingsFile;
    this.languageFolderPath = languageFolderPath;
  }

  _getLwcSettings() {
    return this._lwcSettings;
  }

  /**
   * @param {$} el 
   * @param {Object} settings 
   * @param {Object} attributes 
   * @param {Object} language 
   */
  _translate(el, settings, attributes, language) {
    let translation = el.attr(attributes.textTranslation || 'data-translation');
    let attr = el.attr(attributes.attrTranslation || 'data-translation-attr');
    let replacement = language ? language.json : {};
    let objects = translation.split('.');

    objects.forEach(obj => {
      if (replacement)
        replacement = replacement[obj];
    });

    if (settings.paragraphSupport && (typeof replacement == "string")) {
      let breaks = replacement.split(/\n/g);
      if (breaks.length > 1) {
        for (let j = 0; j < breaks.length; j++)
          breaks[j] = '<p>' + breaks[j] + '</p>';

        replacement = breaks.join('');
      }
    }

    if (attr)
      el.attr(attr, replacement);
    else
      el.html(replacement);
  }

  /**
   * @param {Function} callback 
   */
  _onLoad(callback) {
    let settings = this._getLwcSettings();
    let attributes = settings.attributes || {};
    let language = this.getLanguage(settings.defaultLanguage || 'en-UK');
    let elements = $(`[${attributes.textTranslation || 'data-translation'}]`);
    // console.log(elements);

    elements.each((i, element) => {
      // console.log(element);
      this._translate($(element), settings, attributes, language);
    });

    if (callback) callback.call(this, this.getLanguages());
  }

  /**
   * @param {Array|Object} languages 
   */
  addLanguages(languages) {
    this._languages = languages;
  }

  /**
   * @param {String} filename 
   */
  getLanguage(filename) {
    return this.getLanguages().filter((e) => e.filename == filename)[0];
  }

  getLanguages() {
    return this._languages;
  }

  /**
   * @param {Array|Object} settings 
   */
  setLanguageSettings(settings) {
    this._languageSettings = settings;
  }

  getLanguageSettings() {
    return this._languageSettings;
  }

  /**
   * @param {Boolean} async
   * @param {Object} listeners 
   * @param {Function} listeners.onSettingsLoad 
   * @param {Function} listeners.onLanguageLoaded
   * @param {Function} listeners.onLanguagesLoaded
   */
  load(async, listeners) {
    $.ajax({
      url: this.languageSettingsFile,
      async: async
    }).done((json) => {
      this.setLanguageSettings(json);
      let languages = [];

      for (let i = 0; i < json.length; i++) {
        $.ajax({
          url: this.languageFolderPath + json[i].filename + ".json",
          async: async
        }).done((language) => {
          languages.push({ filename: json[i].filename, json: language });

          if (i == json.length - 1) {
            this.addLanguages(languages);
            this._onLoad(listeners.onLanguagesLoaded);
          }

          if (listeners.onLanguageLoaded) listeners.onLanguageLoaded.call(this, language);
        }).fail((e) => {
          throw new Error("Failed to load language from " + this.languageFolderPath + json[i].filename + ".json");
        });
      }

      if (listeners.onSettingsLoad) listeners.onSettingsLoad.call(this, json);
    }).fail(() => {
      throw new Error("Failed to load " + this.languageSettingsFile);
    });
  }

}

/**
 * @param {Object} settings
 * @param {String} settings.languageSettingsFile
 * @param {String} settings.languageFolderPath
 * @param {Boolean} settings.async
 * @param {String} settings.defaultLanguage
 * @param {Object} settings.attributes
 * @param {String} settings.attributes.textTranslation
 * @param {String} settings.attributes.attrTranslation
 * @param {Boolean} settings.paragraphSupport
 * @param {Function} settings.onLanguageSettingsLoaded
 * @param {Function} settings.onLanguageLoaded
 * @param {Function} settings.onLanguagesLoaded
 */
$.fn.lwcTranslator = function (settings) {
  let translator = new LwcTranslator(settings.languageSettingsFile, settings.languageFolderPath, settings);

  if (!settings || Object.entries(settings).length === 0 && settings.constructor === Object) {
    throw new Error("Please add at least a language settings file path and a folder path.");
  } else {
    if (!settings.languageSettingsFile || !settings.languageFolderPath || settings.languageSettingsFile === '' || settings.languageFolderPath === '') {
      throw new Error("Path cannot be empty.");
    } else {
      settings.paragraphSupport = settings.paragraphSupport || true;
      translator.load(
        settings.async || true, {
        onSettingsLoad: settings.onLanguageSettingsLoaded,
        onLanguageLoaded: settings.onLanguageLoaded,
        onLanguagesLoaded: settings.onLanguagesLoaded
      });
    }
  }

  return translator;
}