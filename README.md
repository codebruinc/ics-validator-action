# ICS Calendar Validator Action

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-ICS%20Calendar%20Validator-blue?logo=github)](https://github.com/marketplace/actions/ics-calendar-validator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A GitHub Action that validates ICS/iCalendar files for format compliance and common issues. Perfect for CI/CD pipelines that work with calendar data.

## Features

- ✅ Validates ICS file structure and format
- ✅ Checks for required calendar properties (VERSION, PRODID)
- ✅ Validates event properties (UID, DTSTAMP, DTSTART)
- ✅ Detects common issues (missing properties, invalid dates, duplicate UIDs)
- ✅ Supports glob patterns for validating multiple files
- ✅ Detailed error and warning reporting
- ✅ Configurable failure conditions

## Usage

### Basic Usage

```yaml
name: Validate Calendar Files
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Validate ICS files
        uses: codebruinc/ics-validator-action@v1
        with:
          files: '**/*.ics'
```

### Advanced Usage

```yaml
name: Calendar Validation
on: 
  pull_request:
    paths:
      - '**.ics'
      - 'calendars/**'

jobs:
  validate-calendars:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Validate calendar files
        uses: codebruinc/ics-validator-action@v1
        with:
          files: 'calendars/**/*.ics'
          fail-on-error: true
          fail-on-warning: false
      
      - name: Upload validation report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: validation-report
          path: validation-report.json
```

### Validate Specific Directory

```yaml
- name: Validate event calendars
  uses: codebruinc/ics-validator-action@v1
  with:
    files: 'events/*.ics'
    fail-on-error: true
```

### Multiple Pattern Validation

```yaml
- name: Validate all calendar files
  uses: codebruinc/ics-validator-action@v1
  with:
    files: |
      events/*.ics
      schedules/*.ics
      exports/*.ical
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `files` | Path to ICS files to validate (supports glob patterns) | No | `**/*.ics` |
| `fail-on-error` | Fail the action if validation errors are found | No | `true` |
| `fail-on-warning` | Fail the action if validation warnings are found | No | `false` |

## Outputs

| Output | Description |
|--------|-------------|
| `errors` | Number of validation errors found |
| `warnings` | Number of validation warnings found |
| `report` | Detailed validation report in JSON format |

### Using Outputs

```yaml
- name: Validate calendars
  id: validate
  uses: codebruinc/ics-validator-action@v1
  with:
    files: '**/*.ics'

- name: Check results
  run: |
    echo "Errors: ${{ steps.validate.outputs.errors }}"
    echo "Warnings: ${{ steps.validate.outputs.warnings }}"
    
- name: Comment on PR
  if: github.event_name == 'pull_request' && steps.validate.outputs.errors > 0
  uses: actions/github-script@v6
  with:
    script: |
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: '❌ Calendar validation failed with ${{ steps.validate.outputs.errors }} errors'
      })
```

## Validation Rules

### Required Properties
- `BEGIN:VCALENDAR` and `END:VCALENDAR` declarations
- `VERSION` property (should be 2.0)
- `UID` for each event
- `DTSTAMP` for each event
- `DTSTART` for each event

### Recommended Properties
- `PRODID` for calendar identification
- `SUMMARY` for event titles
- Either `DTEND` or `DURATION` for event timing

### Common Issues Detected
- Missing required properties
- Invalid date formats
- End date before start date
- Duplicate UIDs
- Both DTEND and DURATION specified
- Missing timezone definitions

## Example Workflow

Here's a complete example workflow that validates calendar files on every push:

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  validate-ics:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Validate ICS files
      id: ics-validator
      uses: codebruinc/ics-validator-action@v1
      with:
        files: '**/*.ics'
        fail-on-error: true
        fail-on-warning: false
    
    - name: Display validation results
      if: always()
      run: |
        echo "### ICS Validation Results" >> $GITHUB_STEP_SUMMARY
        echo "- **Files validated**: $(find . -name "*.ics" | wc -l)" >> $GITHUB_STEP_SUMMARY
        echo "- **Errors**: ${{ steps.ics-validator.outputs.errors }}" >> $GITHUB_STEP_SUMMARY
        echo "- **Warnings**: ${{ steps.ics-validator.outputs.warnings }}" >> $GITHUB_STEP_SUMMARY
```

## Integration with CalendarMap

This action works great with [CalendarMap](https://calendarmap.app) for validating ICS files generated from CSV data:

```yaml
- name: Convert CSV to ICS
  run: |
    # Use CalendarMap CLI or API to convert CSV to ICS
    npx @calendarmap/cli convert events.csv -o calendar.ics
    
- name: Validate generated ICS
  uses: codebruinc/ics-validator-action@v1
  with:
    files: 'calendar.ics'
```

## Development

To contribute to this action:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Build the action: `npm run build`
6. Commit changes (including `dist/` folder)
7. Create a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 🐛 [Report issues](https://github.com/codebruinc/ics-validator-action/issues)
- 💡 [Request features](https://github.com/codebruinc/ics-validator-action/issues/new)
- 📚 [View documentation](https://github.com/codebruinc/ics-validator-action#readme)

## Credits

Created by [CalendarMap](https://calendarmap.app) - The easy way to convert CSV to calendar format.

---

**Note**: This action uses [ical.js](https://github.com/mozilla-comm/ical.js) for parsing and validating ICS files.