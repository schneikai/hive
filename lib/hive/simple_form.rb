# Add another translation lookup key to SimpleForm to allow to use controller
# namespace in translation files.
#
# en:
#   simple_form:
#     labels:
#       user:
#         password: Password
#         registrations:
#           edit:
#             password: New password

module SimpleForm
  class FormBuilder
    # The controller name to be used in lookup.
    def lookup_controller #:nodoc:
      @lookup_controller ||= begin
        controller = template.controller && template.controller_name
        return unless controller
        controller = controller.to_s
      end
    end
  end
end

module SimpleForm
  module Inputs
    class Base
      delegate :lookup_controller, to: :@builder

      def translate_from_namespace(namespace, default = '')
        model_names = lookup_model_names.dup
        lookups     = []

        while !model_names.empty?
          joined_model_names = model_names.join(".")
          model_names.shift

          lookups << :"#{joined_model_names}.#{lookup_controller}.#{lookup_action}.#{reflection_or_attribute_name}"
          lookups << :"#{joined_model_names}.#{lookup_controller}.#{lookup_action}.#{reflection_or_attribute_name}_html"

          lookups << :"#{joined_model_names}.#{lookup_action}.#{reflection_or_attribute_name}"
          lookups << :"#{joined_model_names}.#{lookup_action}.#{reflection_or_attribute_name}_html"
          lookups << :"#{joined_model_names}.#{reflection_or_attribute_name}"
          lookups << :"#{joined_model_names}.#{reflection_or_attribute_name}_html"
        end
        lookups << :"defaults.#{lookup_action}.#{reflection_or_attribute_name}"
        lookups << :"defaults.#{lookup_action}.#{reflection_or_attribute_name}_html"
        lookups << :"defaults.#{reflection_or_attribute_name}"
        lookups << :"defaults.#{reflection_or_attribute_name}_html"
        lookups << default

        t(lookups.shift, scope: :"#{i18n_scope}.#{namespace}", default: lookups).presence
      end
    end
  end
end
