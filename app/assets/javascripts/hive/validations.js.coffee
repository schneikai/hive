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
    @lastValidation = new Date().getTime()

    @form.on 'change', (field)=>
      @changed $(field.target).attr('id')

  # Returns the id for a given field name
  #   fieldId 'email'
  #   => 'user_email'
  fieldId: (name)->
    @model + '_' + name

  # Runs when a field was changed (via @form.on 'change' )
  changed: (fieldId) ->
    unless @isFile(fieldId)
      @changedFields.push fieldId
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
  # Added a timeout of 300ms between validations because when form autocompletion
  # is used in the browser this would fire instantly for -all- autocompleted form fields.
  validate: ->
    elapsed = new Date().getTime() - @lastValidation;

    if elapsed >= 300
      @hideValidationResult()
      $.post '/validations', @serializeForm(), (data)=>
        @showValidationResult data
      @lastValidation = new Date().getTime()

  # Serializes the form and adds parameters that we need for server side validation.
  serializeForm: ->
    @form.serialize() + '&validate_model=' + encodeURIComponent(@model) + '&validate_record_id=' + encodeURIComponent(@recordId)

  showValidationResult: (errors)->
    $.each errors, (field,error)=>
      @showError @fieldId(field), error

  # Show the given error on the given field if
  # * it has changed or
  # * it initally had errors when the form was rendered or
  # * it is a confirmation field of another field and currently does not have the focus
  #   (user typed the password, hit tab to go to the password confirmation field,
  #   we need to wait until he has completed typing the confirmation)
  showError: (fieldId, error)->
    if @hasChanged(fieldId) || (@isConfirmation(fieldId) && !@hasFocus(fieldId))
      field = $('#' + fieldId)
      if @isToggle(fieldId)
        field.parents('.checkbox, .radio').addClass('has-error')
        field.parents('label').after $(@errorHtml(error))
      else
        field.parents('.form-group').addClass('has-error')
        field.after $(@errorHtml(error))

  hideValidationResult: ->
    # Add all fields that currently have errors to the changed fields list.
    # When the form is rendered and a field initally has errors we would hide
    # its error message here but not display it again because it is not in the
    # changed fields list when *showError* runs.
    @form.find('.has-error').each (index, element)=>
      fieldId = $(element).find('input[id]').attr('id')
      @changedFields.push fieldId unless @hasChanged(fieldId)

    @form.find('.has-error').removeClass('has-error');
    @form.find('.validator-error').remove()

  # Returns a html code snippet with the error message.
  errorHtml: (error)->
    '<span class="help-block validator-error">' + error + '</span>'

$ ->
  # Crate a validator instance for every form that needs client side validation.
  $('form[data-validate=true]').each ->
    new Validator($(this))
