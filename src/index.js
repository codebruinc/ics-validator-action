const core = require('@actions/core');
const glob = require('@actions/glob');
const fs = require('fs').promises;
const path = require('path');
const ICAL = require('ical.js');

/**
 * Validates an ICS file and returns validation results
 * @param {string} filePath - Path to the ICS file
 * @returns {Object} Validation results with errors and warnings
 */
async function validateICSFile(filePath) {
  const errors = [];
  const warnings = [];
  
  try {
    // Read the file
    const content = await fs.readFile(filePath, 'utf8');
    
    // Basic format checks
    if (!content.includes('BEGIN:VCALENDAR')) {
      errors.push(`Missing BEGIN:VCALENDAR declaration`);
    }
    if (!content.includes('END:VCALENDAR')) {
      errors.push(`Missing END:VCALENDAR declaration`);
    }
    if (!content.includes('VERSION:')) {
      errors.push(`Missing VERSION property`);
    }
    if (!content.includes('PRODID:')) {
      warnings.push(`Missing PRODID property (recommended)`);
    }
    
    // Parse with ical.js for detailed validation
    try {
      const jcalData = ICAL.parse(content);
      const vcalendar = new ICAL.Component(jcalData);
      
      // Check for required calendar properties
      const version = vcalendar.getFirstPropertyValue('version');
      if (version !== '2.0') {
        warnings.push(`VERSION should be 2.0, found: ${version}`);
      }
      
      // Validate events
      const vevents = vcalendar.getAllSubcomponents('vevent');
      
      if (vevents.length === 0) {
        warnings.push('No events found in calendar');
      }
      
      vevents.forEach((vevent, index) => {
        const eventNum = index + 1;
        
        // Check required event properties
        if (!vevent.getFirstPropertyValue('uid')) {
          errors.push(`Event ${eventNum}: Missing UID property`);
        }
        
        if (!vevent.getFirstPropertyValue('dtstamp')) {
          errors.push(`Event ${eventNum}: Missing DTSTAMP property`);
        }
        
        const dtstart = vevent.getFirstPropertyValue('dtstart');
        if (!dtstart) {
          errors.push(`Event ${eventNum}: Missing DTSTART property`);
        }
        
        const summary = vevent.getFirstPropertyValue('summary');
        if (!summary) {
          warnings.push(`Event ${eventNum}: Missing SUMMARY property (recommended)`);
        }
        
        // Check for dtend or duration
        const dtend = vevent.getFirstPropertyValue('dtend');
        const duration = vevent.getFirstPropertyValue('duration');
        
        if (!dtend && !duration) {
          warnings.push(`Event ${eventNum}: No DTEND or DURATION specified`);
        }
        
        if (dtend && duration) {
          errors.push(`Event ${eventNum}: Both DTEND and DURATION specified (only one allowed)`);
        }
        
        // Validate dates
        if (dtstart && dtend) {
          try {
            const startDate = dtstart.toJSDate();
            const endDate = dtend.toJSDate();
            
            if (endDate < startDate) {
              errors.push(`Event ${eventNum}: End date is before start date`);
            }
          } catch (e) {
            // Date parsing handled by ical.js
          }
        }
        
        // Check for timezone issues
        if (dtstart && dtstart.zone && dtstart.zone.tzid) {
          const tzid = dtstart.zone.tzid;
          if (!vcalendar.getFirstSubcomponent('vtimezone')) {
            warnings.push(`Event ${eventNum}: Uses timezone ${tzid} but no VTIMEZONE component found`);
          }
        }
      });
      
      // Check for duplicate UIDs
      const uids = new Set();
      vevents.forEach((vevent, index) => {
        const uid = vevent.getFirstPropertyValue('uid');
        if (uid) {
          if (uids.has(uid)) {
            errors.push(`Duplicate UID found: ${uid}`);
          }
          uids.add(uid);
        }
      });
      
    } catch (parseError) {
      errors.push(`Failed to parse ICS file: ${parseError.message}`);
    }
    
  } catch (error) {
    errors.push(`Failed to read file: ${error.message}`);
  }
  
  return { errors, warnings };
}

/**
 * Main action function
 */
async function run() {
  try {
    // Get inputs
    const filesPattern = core.getInput('files');
    const failOnError = core.getInput('fail-on-error') === 'true';
    const failOnWarning = core.getInput('fail-on-warning') === 'true';
    
    // Find all matching files
    const globber = await glob.create(filesPattern);
    const files = await globber.glob();
    
    if (files.length === 0) {
      core.warning(`No ICS files found matching pattern: ${filesPattern}`);
      return;
    }
    
    core.info(`Found ${files.length} ICS file(s) to validate`);
    
    // Validate all files
    let totalErrors = 0;
    let totalWarnings = 0;
    const report = {};
    
    for (const file of files) {
      const relativePath = path.relative(process.cwd(), file);
      core.info(`Validating: ${relativePath}`);
      
      const result = await validateICSFile(file);
      report[relativePath] = result;
      
      // Log errors and warnings
      result.errors.forEach(error => {
        core.error(`${relativePath}: ${error}`);
        totalErrors++;
      });
      
      result.warnings.forEach(warning => {
        core.warning(`${relativePath}: ${warning}`);
        totalWarnings++;
      });
    }
    
    // Set outputs
    core.setOutput('errors', totalErrors.toString());
    core.setOutput('warnings', totalWarnings.toString());
    core.setOutput('report', JSON.stringify(report, null, 2));
    
    // Summary
    core.info('');
    core.info('=== Validation Summary ===');
    core.info(`Total files validated: ${files.length}`);
    core.info(`Total errors: ${totalErrors}`);
    core.info(`Total warnings: ${totalWarnings}`);
    
    // Fail if needed
    if (failOnError && totalErrors > 0) {
      core.setFailed(`Validation failed with ${totalErrors} error(s)`);
    } else if (failOnWarning && totalWarnings > 0) {
      core.setFailed(`Validation failed with ${totalWarnings} warning(s)`);
    } else if (totalErrors === 0 && totalWarnings === 0) {
      core.info('✅ All ICS files are valid!');
    }
    
  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

// Run the action
run();