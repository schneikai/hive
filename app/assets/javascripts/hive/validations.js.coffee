# This adds client side validation to forms with <tt>data-validate=true</tt>.
#
# It works by serializing the form and ajax-posting it tho the +ValidationsController+.
# There a new model (read from data attribute +model+ on the form) is instantiated
# the params are assigned and the validation result is returned back to the client.
#
# The error messages are then shown on the fields that brought validation errors.

class Validator
  constructor: (@form) ->
    @model = @form.data('model') || 'user'
    @recordId = @form.data('id')
    @validationTimeout = undefined;
    @unvalidatedChanges = false

    # Add all fields that currently have errors to the changed fields list.
    # When the form is rendered and a field initally has errors we would hide
    # its error message here but not display it again because it is not in the
    # changed fields list when *showError* runs.
    @form.find('.has-error').each (index, element)=>
      fieldId = $(element).find('input[id]').attr('id')
      @changedFields.push fieldId unless @hasChanged(fieldId)

    # Attach to the change event on the form to catch field changes.
    @form.on 'change', (event)=>
      @changed $(event.target).attr('id')

    # Hide form errors on fields that are beeing edited.
    @form.on 'keyup', (event)=>
      @hideValidationResultOnField $(event.target).attr('id')

  # Returns the id for a given field name
  #   fieldId 'email'
  #   => 'user_email'
  fieldId: (name)->
    @model + '_' + name

  # Runs when a field was changed (via @form.on 'change' )
  # We can't vaildate file fields right now because we would need to send
  # the file to the server on every validation which would be a big overhead...
  changed: (fieldId) ->
    unless @isFile(fieldId)
      @unvalidatedChanges = true # We use this to check if the form was changed while being validated.
      @changedFields.push fieldId unless @hasChanged(fieldId)
      @validate()

  # Returns true if field has changed.
  hasChanged: (fieldId)->
    $.inArray(fieldId, @changedFields) >= 0

  # Returns true if the given field currently has the focus.
  hasFocus: (fieldId)->
    $(':focus').attr('id') == fieldId

  # Returns true if field is a confirmation field (id ends with '_confirmation')
  isConfirmation: (fieldId)->
    fieldId.split('_').pop() == 'confirmation'

  # Returns true if the field is a check box or radio button.
  isToggle: (fieldId)->
    $('#' + fieldId).attr('type') == 'checkbox' || $('#' + fieldId).attr('type') == 'radio'

  # Returns true if the field is a file field.
  isFile: (fieldId)->
    $('#' + fieldId).attr('type') == 'file'

  # Holds an array of all changed field ids.
  changedFields: []

  # Validates the form and show validation errors.
  # Added a timeout between validations because when form autocompletion
  # is used in the browser this would fire instantly for -all- autocompleted form fields.
  validate: ->
    @hideValidationResult()
    clearTimeout(@validationTimeout) if @validationTimeout
    @validationTimeout = setTimeout @validateWithTimeout, 250

  validateWithTimeout: =>
    @unvalidatedChanges = false
    $.post '/validations', @serializeForm(), (data)=>
      if @unvalidatedChanges
        # The form was changed. We need to validate it again :(
        @validate()
      else
        @showValidationResult data

  # Serializes the form and adds parameters that we need for server side validation.
  serializeForm: ->
    @form.serialize() + '&validate_model=' + encodeURIComponent(@model) + '&validate_record_id=' + encodeURIComponent(@recordId)

  # Process the validation result and show the error if the field:
  # * has changed or
  # * initally had errors when the form was rendered or
  # * is a confirmation field of another field and currently does not have the focus
  #   (user typed the password, hit tab to go to the password confirmation field,
  #   we need to wait until he has completed typing the confirmation)
  showValidationResult: (errors)->
    console.log errors
    $.each errors, (field, errors)=>
      fieldId = @fieldId(field)

      if @hasChanged(fieldId) || (@isConfirmation(fieldId) && !@hasFocus(fieldId))
        @showError fieldId, errors

  # Show the given error on the given field
  # If a field has multiple error messages we only show the first to not bomb
  # the user with error messages.
  showError: (fieldId, errors)->
    field = $('#' + fieldId)
    error = errors[0]
    if @isToggle(fieldId)
      field.parents('.checkbox, .radio').addClass('has-error')
      field.parents('label').after $(@errorHtml(error))
    else
      field.parents('.form-group').addClass('has-error')
      field.after $(@errorHtml(error))

  # Hide all error messages.
  hideValidationResult: ->
    @form.find('.has-error').removeClass('has-error')
    @form.find('.validator-error').remove()

  hideValidationResultOnField: (fieldId)->
    $('.form-group.' + fieldId + '.has-error').removeClass('has-error')
    $('.form-group.' + fieldId).find('.validator-error').remove()

  # Returns a html code snippet with the error message.
  errorHtml: (error)->
    '<span class="help-block validator-error">' + error + '</span>'

$ ->
  # Crate a validator instance for every form that needs client side validation.
  $('form[data-validate=true]').each ->
    new Validator($(this))
