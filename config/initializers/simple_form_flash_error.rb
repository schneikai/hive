# Creates a flash message for the error on the given attribute.
# Works just like SimpleForms <tt>f.error</tt> but instead of a error notification
# on the form it creates a flash message. Can be used for errors on +base+ or
# errors on hidden fields.
module SimpleFormFlashError
  def flash_error(attribute_name, options = {})
    options = options.dup

    options[:flash_type] ||= :error

    options[:error_prefix] ||= if object.class.respond_to?(:human_attribute_name)
      object.class.human_attribute_name(attribute_name.to_s)
    else
      attribute_name.to_s.humanize
    end

    column      = find_attribute_column(attribute_name)
    input_type  = default_input_type(attribute_name, column, options)
    input = SimpleForm::Inputs::Base.new(self, attribute_name, column, input_type, options)

    # We need to make sure that we don't overwrite existing flash messages.
    # So if there already is content in the flash, we just add ours after a break.
    if input.has_errors?
      template.flash.now[options[:flash_type]] = template.safe_join([template.flash.now[options[:flash_type]], input.error].compact, "<br>".html_safe)
    end
    nil
  end
end
SimpleForm::FormBuilder.send :include, SimpleFormFlashError
