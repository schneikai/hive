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
      attr = @attributeFor($(element).find('input[id]'))
      @changedFields.push attr unless @hasChanged(attr)

    # Attach to the change event on the form to catch field changes.
    @form.on 'change', (event)=>
      @changed @attributeFor($(event.target))

    # Hide form errors on fields that are beeing edited.
    @form.on 'keyup', (event)=>
      @hideValidationResult @attributeFor($(event.target))

  # Returns the attribute for a given field or field id. Removes possible Rails
  # multi parameter identifiers.
  #   attributeFor $('#user_dob_1i')
  #   => user_dob
  attributeFor: (fieldOrId)->
    if fieldOrId instanceof jQuery
      @attributeFor(fieldOrId.attr('id'))
    else
      fieldOrId.replace(/_[0-9][i|f|s|a]$/, '') if fieldOrId

  # Returns the field for a given attribute. A jQuery object is returned.
  # This might return multiple fields if the attribute is entered via a Rails
  # multi parameter input (date_select for example).
  #   fields = fieldFor('user_dob')
  #   fields.length
  #   => 3
  fieldFor: (attribute)->
    @form.find('[id]').filter(->
      this.id.match(new RegExp('^' + attribute + '($|_[0-9][i|f|s|a]$)'))
    )

  # Runs when a field was changed (via @form.on 'change' )
  # We can't validate file fields right now because we would need to send
  # the file to the server on every validation which would be a big overhead...
  changed: (attribute) ->
    unless @isFile(attribute)
      @unvalidatedChanges = true # We use this to check if the form was changed while being validated.
      @changedFields.push attribute unless @hasChanged(attribute)
      @validate()

  # Returns true if the attribute was changed.
  hasChanged: (attribute)->
    $.inArray(attribute, @changedFields) >= 0

  # Returns true if the field for the given attribute currently has the focus.
  hasFocus: (attribute)->
    @attributeFor($(':focus').attr('id')) == attribute

  # Returns true if attribute is a confirmation field. The id ends with
  # '_confirmation' for example 'password_confirmation'.
  isConfirmation: (attribute)->
    attribute.split('_').pop() == 'confirmation'

  # Returns true if the attribute uses a check box or radio button as the input.
  isToggle: (attribute)->
    @fieldFor(attribute).attr('type') == 'checkbox' || @fieldFor(attribute).attr('type') == 'radio'

  # Returns true if the attribute uses a file input.
  isFile: (attribute)->
    @fieldFor(attribute).attr('type') == 'file'

  # Holds an array of all changed attributes.
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

  # Process the validation result and show the error if the attributes:
  # * has changed or
  # * initally had errors when the form was rendered or
  # * is a confirmation of another attribute and currently does not have the focus
  #   (user typed the password, hit tab to go to the password confirmation field,
  #   we need to wait until he has completed typing the confirmation)
  showValidationResult: (errors)->
    $.each errors, (attr, errors)=>
      attribute = @model + '_' + attr

      if @hasChanged(attribute) || (@isConfirmation(attribute) && !@hasFocus(attribute))
        @showError attribute, errors

  # Show the given error on the input field for the given attribute.
  # If a attribute has multiple error messages we only show the first to not
  # bomb the user with error messages.
  showError: (attribute, errors)->
    field = @fieldFor(attribute).first()
    error = errors[0]
    if @isToggle(attribute)
      field.parents('.checkbox, .radio').addClass('has-error')
      field.parents('label').after $(@errorHtml(error))
    else
      field.parents('.form-group').addClass('has-error')
      field.after $(@errorHtml(error))

  # Hide error messages on given attribute or all attributes
  # if no attribute is given.
  hideValidationResult: (attribute)->
    if attribute
      $('.form-group.' + attribute + '.has-error').removeClass('has-error')
      $('.form-group.' + attribute).find('.validator-error').remove()
    else
      @form.find('.has-error').removeClass('has-error')
      @form.find('.validator-error').remove()

  # Returns a html markup template for the error message.
  errorHtml: (error)->
    '<span class="help-block validator-error">' + error + '</span>'

$ ->
  # Crate a validator instance for every form that needs client side validation.
  $('form[data-validate=true]').each ->
    new Validator($(this))
